import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { parseStringPromise } from 'xml2js';

export interface MeuDanfeAddResponse {
  value: string;
  type: 'NFE' | 'CTE';
  status: 'WAITING' | 'SEARCHING' | 'NOT_FOUND' | 'OK' | 'ERROR';
  statusMessage: string;
}

export interface MeuDanfePdfResponse {
  name: string;
  type: 'NFE' | 'CTE';
  format: 'BASE64';
  data: string;
}

export interface MeuDanfeXmlResponse {
  name: string;
  type: 'NFE' | 'CTE';
  format: 'XML';
  data: string;
}

export interface DadosExtraidosNfe {
  emit_nome: string | null;
  emit_cnpj: string | null;
  emit_uf: string | null;
  dest_nome: string | null;
  dest_cnpj_cpf: string | null;
  dest_municipio: string | null;
  dest_uf: string | null;
  numero_nfe: string | null;
  serie: string | null;
  data_emissao: Date | null;
  valor_total: number | null;
  valor_produtos: number | null;
  valor_frete: number | null;
  valor_desconto: number | null;
  quantidade_itens: number | null;
  natureza_operacao: string | null;
  transportadora_nome: string | null;
  peso_bruto: number | null;
}

@Injectable()
export class MeuDanfeService {
  private readonly logger = new Logger(MeuDanfeService.name);
  private readonly baseUrl = 'https://api.meudanfe.com.br/v2';
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>(
      'MEUDANFE_API_KEY',
      '2c0cc96a-1b1c-4548-87c9-58810c302030',
    );
  }

  async solicitarNfe(chaveAcesso: string): Promise<MeuDanfeAddResponse> {
    const url = `${this.baseUrl}/fd/add/${chaveAcesso}`;
    const { data } = await firstValueFrom(
      this.httpService.put<MeuDanfeAddResponse>(url, null, {
        headers: { 'Api-Key': this.apiKey },
      }),
    );
    return data;
  }

  async baixarDanfePdf(chaveAcesso: string): Promise<MeuDanfePdfResponse> {
    const url = `${this.baseUrl}/fd/get/da/${chaveAcesso}`;
    const { data } = await firstValueFrom(
      this.httpService.get<MeuDanfePdfResponse>(url, {
        headers: { 'Api-Key': this.apiKey },
      }),
    );
    return data;
  }

  async baixarXml(chaveAcesso: string): Promise<MeuDanfeXmlResponse> {
    const url = `${this.baseUrl}/fd/get/xml/${chaveAcesso}`;
    const { data } = await firstValueFrom(
      this.httpService.get<MeuDanfeXmlResponse>(url, {
        headers: { 'Api-Key': this.apiKey },
      }),
    );
    return data;
  }

  /**
   * Fluxo completo: solicita NF-e, aguarda disponibilidade,
   * retorna PDF (base64) e dados extraídos do XML.
   */
  async obterDadosCompletos(
    chaveAcesso: string,
    maxTentativas = 6,
    intervalMs = 2000,
  ): Promise<{ pdfBase64: string | null; dadosNfe: DadosExtraidosNfe | null }> {
    try {
      const addResp = await this.solicitarNfe(chaveAcesso);
      this.logger.log(`MeuDanfe status: ${addResp.status} — chave ${chaveAcesso}`);

      if (addResp.status === 'NOT_FOUND' || addResp.status === 'ERROR') {
        this.logger.warn(`NF-e não encontrada: ${addResp.statusMessage}`);
        return { pdfBase64: null, dadosNfe: null };
      }

      // Polling até NF-e estar disponível
      let disponivel = addResp.status === 'OK';
      for (let i = 0; i < maxTentativas && !disponivel; i++) {
        await this.sleep(intervalMs);
        const status = await this.solicitarNfe(chaveAcesso);
        if (status.status === 'NOT_FOUND' || status.status === 'ERROR') {
          return { pdfBase64: null, dadosNfe: null };
        }
        disponivel = status.status === 'OK';
      }

      if (!disponivel) {
        this.logger.warn(`Timeout aguardando NF-e: ${chaveAcesso}`);
        return { pdfBase64: null, dadosNfe: null };
      }

      // Busca PDF e XML em paralelo
      const [pdfResult, xmlResult] = await Promise.allSettled([
        this.baixarDanfePdf(chaveAcesso),
        this.baixarXml(chaveAcesso),
      ]);

      const pdfBase64 =
        pdfResult.status === 'fulfilled' ? pdfResult.value.data : null;

      const dadosNfe =
        xmlResult.status === 'fulfilled'
          ? await this.extrairDadosXml(xmlResult.value.data)
          : null;

      if (xmlResult.status === 'rejected') {
        this.logger.warn(`Falha ao baixar XML: ${(xmlResult.reason as Error).message}`);
      }

      return { pdfBase64, dadosNfe };
    } catch (err) {
      this.logger.error(`Erro ao obter dados NF-e: ${(err as Error).message}`);
      return { pdfBase64: null, dadosNfe: null };
    }
  }

  /** Mantido para compatibilidade com reprocessarDanfe */
  async obterDanfePdf(chaveAcesso: string): Promise<string | null> {
    const { pdfBase64 } = await this.obterDadosCompletos(chaveAcesso);
    return pdfBase64;
  }

  async extrairDadosXml(xmlString: string): Promise<DadosExtraidosNfe | null> {
    try {
      const parsed = await parseStringPromise(xmlString, { explicitArray: false });

      // Suporta tanto nfeProc (com protocolo) quanto NFe direto
      const nfe = parsed?.nfeProc?.NFe ?? parsed?.NFe;
      const infNFe = nfe?.infNFe;
      if (!infNFe) return null;

      const ide = infNFe.ide ?? {};
      const emit = infNFe.emit ?? {};
      const dest = infNFe.dest ?? {};
      const total = infNFe.total?.ICMSTot ?? {};
      const transp = infNFe.transp ?? {};
      const det = infNFe.det;

      // Quantidade de itens (det pode ser array ou objeto único)
      const quantidadeItens = Array.isArray(det)
        ? det.length
        : det
        ? 1
        : null;

      // CNPJ ou CPF do destinatário
      const destCnpjCpf = dest.CNPJ ?? dest.CPF ?? null;

      // Peso bruto (primeiro volume)
      const vol = transp.vol;
      const pesoBruto = vol
        ? parseFloat(Array.isArray(vol) ? vol[0]?.pesoB : vol?.pesoB) || null
        : null;

      return {
        emit_nome: emit.xNome ?? null,
        emit_cnpj: emit.CNPJ ?? null,
        emit_uf: emit.enderEmit?.UF ?? null,
        dest_nome: dest.xNome ?? null,
        dest_cnpj_cpf: destCnpjCpf,
        dest_municipio: dest.enderDest?.xMun ?? null,
        dest_uf: dest.enderDest?.UF ?? null,
        numero_nfe: ide.nNF ?? null,
        serie: ide.serie ?? null,
        data_emissao: ide.dhEmi ? new Date(ide.dhEmi) : null,
        valor_total: parseFloat(total.vNF) || null,
        valor_produtos: parseFloat(total.vProd) || null,
        valor_frete: parseFloat(total.vFrete) || null,
        valor_desconto: parseFloat(total.vDesc) || null,
        quantidade_itens: quantidadeItens,
        natureza_operacao: ide.natOp ?? null,
        transportadora_nome: transp.transporta?.xNome ?? null,
        peso_bruto: pesoBruto,
      };
    } catch (err) {
      this.logger.error(`Erro ao parsear XML NF-e: ${(err as Error).message}`);
      return null;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
