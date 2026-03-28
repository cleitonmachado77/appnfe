import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NfeEmitida, StatusNfeEmitida } from '../entities/nfe-emitida.entity';
import { ControleNsu } from '../entities/controle-nsu.entity';
import { Empresa } from '../entities/empresa.entity';
import { SefazDfeService } from './sefaz-dfe.service';
import { MeuDanfeService } from '../entregas/meudanfe.service';
import { CertificadoService } from './certificado.service';
import { parseStringPromise } from 'xml2js';

@Injectable()
export class NfeCapturaService {
  private readonly logger = new Logger(NfeCapturaService.name);

  constructor(
    @InjectRepository(NfeEmitida)
    private readonly nfeEmitidaRepo: Repository<NfeEmitida>,
    @InjectRepository(ControleNsu)
    private readonly controleNsuRepo: Repository<ControleNsu>,
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    private readonly sefazDfeService: SefazDfeService,
    private readonly meuDanfeService: MeuDanfeService,
    private readonly certificadoService: CertificadoService,
  ) {}

  /**
   * Captura NF-e para uma empresa específica (por ID).
   * Usado pelo endpoint de captura manual.
   */
  async capturarPorEmpresaId(empresaId: string): Promise<{ message: string; cStat?: string; documentos?: number }> {
    const empresa = await this.empresaRepo.findOne({ where: { id: empresaId } });
    if (!empresa) {
      this.logger.warn(`Empresa ${empresaId} não encontrada para captura manual`);
      throw new Error('Empresa não encontrada');
    }

    const certificado = await this.certificadoService.obterCertificado(empresaId);
    if (!certificado) {
      this.logger.warn(`Empresa ${empresa.cnpj} não possui certificado configurado`);
      throw new Error('Certificado digital não configurado. Configure na aba Certificado.');
    }

    this.logger.log(`Iniciando captura manual para empresa ${empresa.cnpj} (${empresa.razao_social})`);
    return this.capturarPorEmpresa(empresa, certificado);
  }

  /**
   * Executa a captura para todas as empresas ativas que possuem certificado configurado.
   * Chamado pelo scheduler a cada 5 minutos.
   */
  async capturarTodasEmpresas(): Promise<void> {
    const empresas = await this.empresaRepo.find({ where: { status: 'ATIVA' as any } });

    for (const empresa of empresas) {
      const certificado = await this.certificadoService.obterCertificado(empresa.id);
      if (!certificado) continue; // Empresa sem certificado configurado

      try {
        await this.capturarPorEmpresa(empresa, certificado);
      } catch (err) {
        this.logger.error(
          `Erro ao capturar NF-e para empresa ${empresa.cnpj}: ${(err as Error).message}`,
        );
      }
    }
  }

  /**
   * Captura NF-e para uma empresa específica, processando todos os NSUs pendentes.
   */
  async capturarPorEmpresa(empresa: Empresa, certificado: { pfxBase64: string; senha: string }): Promise<{ message: string; cStat?: string; documentos?: number }> {
    const cnpjLimpo = empresa.cnpj.replace(/\D/g, '');
    let controle = await this.controleNsuRepo.findOne({ where: { empresa_id: empresa.id } });

    if (!controle) {
      controle = this.controleNsuRepo.create({
        empresa_id: empresa.id,
        ult_nsu: '000000000000000',
      });
      controle = await this.controleNsuRepo.save(controle);
    }

    // Respeita intervalo mínimo de 1h da SEFAZ quando não há documentos novos
    const agora = new Date();
    const ultimaConsulta = controle.atualizado_em ? new Date(controle.atualizado_em) : null;
    const diffMinutos = ultimaConsulta ? (agora.getTime() - ultimaConsulta.getTime()) / 60000 : Infinity;

    // Se o último NSU == max_nsu (sem docs pendentes) e consultou há menos de 60 min, pula
    if (controle.ult_nsu === controle.max_nsu && diffMinutos < 60) {
      const restante = Math.ceil(60 - diffMinutos);
      this.logger.log(`Empresa ${cnpjLimpo}: sem documentos pendentes, próxima consulta em ${restante} min`);
      return {
        message: `Sem documentos pendentes. A SEFAZ exige intervalo de 1h entre consultas quando não há novos documentos. Próxima consulta automática em ~${restante} minutos.`,
        cStat: '137',
        documentos: 0,
      };
    }

    const ambiente = 1;
    const cUF = this.ufParaCodigo(empresa.uf);
    let ultNsu = controle.ult_nsu;
    let continuar = true;
    let totalDocumentos = 0;
    let ultimoCstat = '';
    let ultimoMotivo = '';

    while (continuar) {
      this.logger.log(`Consultando SEFAZ para ${cnpjLimpo} a partir do NSU ${ultNsu} (cUF=${cUF}, ambiente=${ambiente})`);

      const resposta = await this.sefazDfeService.consultarDistribuicao(
        cnpjLimpo,
        ultNsu,
        certificado,
        ambiente as 1 | 2,
        cUF,
      );

      ultimoCstat = resposta.cStat;
      ultimoMotivo = resposta.xMotivo;
      this.logger.log(`SEFAZ retornou cStat=${resposta.cStat} — ${resposta.xMotivo} (docs: ${resposta.documentos.length})`);

      // 656 = consumo indevido (aguardar 1h)
      if (resposta.cStat === '656') {
        // Atualiza timestamp para marcar que já tentou
        await this.controleNsuRepo.update(controle.id, { max_nsu: controle.ult_nsu });
        return {
          message: 'A SEFAZ exige intervalo de 1h entre consultas quando não há novos documentos. Tente novamente mais tarde.',
          cStat: '656',
          documentos: 0,
        };
      }

      // 137 = nenhum documento novo; 138 = documentos encontrados
      if (resposta.cStat !== '138' && resposta.cStat !== '137') {
        this.logger.warn(`Status inesperado da SEFAZ: ${resposta.cStat} — ${resposta.xMotivo}`);
        break;
      }

      for (const doc of resposta.documentos) {
        await this.processarDocumento(empresa.id, doc.nsu, doc.schema, doc.xmlBase64);
      }
      totalDocumentos += resposta.documentos.length;

      // Atualiza NSU no controle
      await this.controleNsuRepo.update(controle.id, {
        ult_nsu: resposta.ultNSU,
        max_nsu: resposta.maxNSU,
      });

      ultNsu = resposta.ultNSU;

      // Para quando não há mais documentos ou chegou ao máximo
      continuar =
        resposta.cStat === '138' &&
        resposta.documentos.length > 0 &&
        resposta.ultNSU !== resposta.maxNSU;
    }

    return {
      message: totalDocumentos > 0
        ? `Captura concluída: ${totalDocumentos} documento(s) processado(s).`
        : `Nenhum documento novo encontrado. SEFAZ: ${ultimoMotivo}`,
      cStat: ultimoCstat,
      documentos: totalDocumentos,
    };
  }

  /**
   * Processa um documento individual do lote DF-e.
   */
  private async processarDocumento(
    empresaId: string,
    nsu: string,
    schema: string,
    xmlBase64: string,
  ): Promise<void> {
    try {
      const xmlString = this.sefazDfeService.descompactarDocumento(xmlBase64);

      if (schema.startsWith('resNFe')) {
        await this.processarResumoNfe(empresaId, nsu, xmlString);
      } else if (schema.startsWith('procNFe')) {
        await this.processarNfeCompleta(empresaId, nsu, xmlString);
      } else if (schema.startsWith('procEventoNFe')) {
        await this.processarEventoNfe(empresaId, nsu, xmlString);
      }
    } catch (err) {
      this.logger.error(`Erro ao processar NSU ${nsu}: ${(err as Error).message}`);
    }
  }

  /** Processa resumo de NF-e (resNFe) — apenas dados básicos */
  private async processarResumoNfe(empresaId: string, nsu: string, xml: string): Promise<void> {
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const resNFe = parsed?.resNFe;
    if (!resNFe) return;

    const chaveNfe = resNFe?.chNFe;
    if (!chaveNfe) return;

    const existente = await this.nfeEmitidaRepo.findOne({ where: { chave_nfe: chaveNfe } });
    if (existente) return; // Já registrada

    await this.nfeEmitidaRepo.save(
      this.nfeEmitidaRepo.create({
        empresa_id: empresaId,
        chave_nfe: chaveNfe,
        nsu,
        numero_nfe: resNFe?.nNF ?? null,
        serie: resNFe?.serie ?? null,
        dest_nome: resNFe?.xDest ?? null,
        dest_cnpj_cpf: resNFe?.CNPJ ?? resNFe?.CPF ?? null,
        valor_total: parseFloat(resNFe?.vNF) || null,
        data_emissao: resNFe?.dhEmi ? new Date(resNFe.dhEmi) : null,
        natureza_operacao: resNFe?.natOp ?? null,
        status: StatusNfeEmitida.PENDENTE,
      }),
    );

    this.logger.log(`Resumo NF-e registrado: chave ${chaveNfe}`);
  }

  /** Processa NF-e completa (procNFe) — XML completo + extrai dados */
  private async processarNfeCompleta(empresaId: string, nsu: string, xml: string): Promise<void> {
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const infNFe = parsed?.nfeProc?.NFe?.infNFe ?? parsed?.NFe?.infNFe;
    if (!infNFe) return;

    const chaveNfe = infNFe?.['$']?.Id?.replace('NFe', '') ?? null;
    if (!chaveNfe) return;

    const ide = infNFe.ide ?? {};
    const dest = infNFe.dest ?? {};
    const total = infNFe.total?.ICMSTot ?? {};

    const dados = {
      nsu,
      xml_completo: xml,
      numero_nfe: ide.nNF ?? null,
      serie: ide.serie ?? null,
      dest_nome: dest.xNome ?? null,
      dest_cnpj_cpf: dest.CNPJ ?? dest.CPF ?? null,
      dest_municipio: dest.enderDest?.xMun ?? null,
      dest_uf: dest.enderDest?.UF ?? null,
      valor_total: parseFloat(total.vNF) || null,
      data_emissao: ide.dhEmi ? new Date(ide.dhEmi) : null,
      natureza_operacao: ide.natOp ?? null,
      status: StatusNfeEmitida.COMPLETA,
    };

    const existente = await this.nfeEmitidaRepo.findOne({ where: { chave_nfe: chaveNfe } });

    if (existente) {
      await this.nfeEmitidaRepo.update(existente.id, dados);
    } else {
      await this.nfeEmitidaRepo.save(
        this.nfeEmitidaRepo.create({ empresa_id: empresaId, chave_nfe: chaveNfe, ...dados }),
      );
    }

    // Busca DANFE via MeuDanfe de forma assíncrona
    this.meuDanfeService.obterDanfePdf(chaveNfe).then(async (pdfBase64) => {
      if (pdfBase64) {
        await this.nfeEmitidaRepo.update(
          { chave_nfe: chaveNfe },
          { danfe_pdf_base64: pdfBase64 },
        );
      }
    }).catch(() => {/* silencia erro de DANFE */});

    this.logger.log(`NF-e completa processada: chave ${chaveNfe}`);
  }

  /** Processa evento (cancelamento, etc.) */
  private async processarEventoNfe(empresaId: string, nsu: string, xml: string): Promise<void> {
    const parsed = await parseStringPromise(xml, { explicitArray: false });
    const evento = parsed?.procEventoNFe?.evento?.infEvento ?? parsed?.evento?.infEvento;
    if (!evento) return;

    const chaveNfe = evento?.chNFe;
    const tpEvento = evento?.tpEvento;

    // 110111 = Cancelamento
    if (tpEvento === '110111' && chaveNfe) {
      await this.nfeEmitidaRepo.update(
        { chave_nfe: chaveNfe },
        { status: StatusNfeEmitida.CANCELADA },
      );
      this.logger.log(`NF-e cancelada: chave ${chaveNfe}`);
    }
  }

  // ─── Métodos públicos para o controller ──────────────────────────────────────

  async listarNfeEmitidas(
    empresaId: string,
    filtros: {
      page?: number;
      limit?: number;
      status?: StatusNfeEmitida;
      data_inicio?: string;
      data_fim?: string;
      dest_cnpj?: string;
      chave_nfe?: string;
    },
  ) {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;

    const qb = this.nfeEmitidaRepo
      .createQueryBuilder('nfe')
      .where('nfe.empresa_id = :empresaId', { empresaId })
      .orderBy('nfe.data_emissao', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filtros.status) qb.andWhere('nfe.status = :status', { status: filtros.status });
    if (filtros.dest_cnpj) qb.andWhere('nfe.dest_cnpj_cpf = :cnpj', { cnpj: filtros.dest_cnpj });
    if (filtros.chave_nfe) qb.andWhere('nfe.chave_nfe LIKE :chave', { chave: `%${filtros.chave_nfe}%` });
    if (filtros.data_inicio) qb.andWhere('nfe.data_emissao >= :di', { di: filtros.data_inicio });
    if (filtros.data_fim) qb.andWhere('nfe.data_emissao <= :df', { df: filtros.data_fim });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /** Cruzamento: NF-e emitidas vs entregas registradas */
  async cruzarComEntregas(empresaId: string) {
    // NF-e emitidas que têm entrega correspondente
    const comEntrega = await this.nfeEmitidaRepo
      .createQueryBuilder('nfe')
      .innerJoin('entregas', 'e', 'e.chave_nfe = nfe.chave_nfe')
      .where('nfe.empresa_id = :empresaId', { empresaId })
      .select([
        'nfe.chave_nfe',
        'nfe.numero_nfe',
        'nfe.dest_nome',
        'nfe.valor_total',
        'nfe.data_emissao',
        'nfe.status',
        'e.id as entrega_id',
        'e.data_hora as data_entrega',
        'e.status as status_entrega',
      ])
      .getRawMany();

    // NF-e emitidas SEM entrega registrada
    const semEntrega = await this.nfeEmitidaRepo
      .createQueryBuilder('nfe')
      .leftJoin('entregas', 'e', 'e.chave_nfe = nfe.chave_nfe')
      .where('nfe.empresa_id = :empresaId', { empresaId })
      .andWhere('e.id IS NULL')
      .andWhere('nfe.status != :cancelada', { cancelada: StatusNfeEmitida.CANCELADA })
      .select([
        'nfe.id',
        'nfe.chave_nfe',
        'nfe.numero_nfe',
        'nfe.dest_nome',
        'nfe.valor_total',
        'nfe.data_emissao',
      ])
      .getMany();

    return {
      com_entrega: comEntrega,
      sem_entrega: semEntrega,
      total_com_entrega: comEntrega.length,
      total_sem_entrega: semEntrega.length,
    };
  }

  async buscarPorChave(chaveNfe: string, empresaId: string): Promise<NfeEmitida | null> {
    return this.nfeEmitidaRepo.findOne({ where: { chave_nfe: chaveNfe, empresa_id: empresaId } });
  }

  async obterControleNsu(empresaId: string): Promise<ControleNsu | null> {
    return this.controleNsuRepo.findOne({ where: { empresa_id: empresaId } });
  }

  /** Converte sigla UF para código IBGE. Padrão: 35 (SP). */
  private ufParaCodigo(uf: string | null | undefined): number {
    const mapa: Record<string, number> = {
      AC: 12, AL: 27, AM: 13, AP: 16, BA: 29, CE: 23, DF: 53, ES: 32,
      GO: 52, MA: 21, MG: 31, MS: 50, MT: 51, PA: 15, PB: 25, PE: 26,
      PI: 22, PR: 41, RJ: 33, RN: 24, RO: 11, RR: 14, RS: 43, SC: 42,
      SE: 28, SP: 35, TO: 17,
    };
    return mapa[(uf ?? '').toUpperCase()] ?? 35;
  }
}
