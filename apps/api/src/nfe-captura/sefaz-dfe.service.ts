import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as forge from 'node-forge';
import { parseStringPromise } from 'xml2js';
import { createSign } from 'crypto';
import { gunzipSync } from 'zlib';

export interface DocumentoDfe {
  nsu: string;
  schema: string; // resNFe, procNFe, procEventoNFe
  xmlBase64: string;
}

export interface RespostaDfe {
  cStat: string;
  xMotivo: string;
  ultNSU: string;
  maxNSU: string;
  documentos: DocumentoDfe[];
}

export interface CertificadoA1 {
  pfxBase64: string;
  senha: string;
}

@Injectable()
export class SefazDfeService {
  private readonly logger = new Logger(SefazDfeService.name);

  // Endpoint SVRS (usado pela maioria dos estados)
  private readonly endpointProducao =
    'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
  private readonly endpointHomologacao =
    'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Consulta NF-e emitidas/recebidas por CNPJ a partir de um NSU.
   */
  async consultarDistribuicao(
    cnpj: string,
    ultNsu: string,
    certificado: CertificadoA1,
    ambiente: 1 | 2 = 1, // 1=produção, 2=homologação
    cUF = 35, // SP padrão; pode ser parametrizado
  ): Promise<RespostaDfe> {
    const tpAmb = ambiente.toString();
    const nsuFormatado = ultNsu.padStart(15, '0');

    const xmlConsulta = this.montarXmlConsulta(cnpj, nsuFormatado, tpAmb, cUF);
    const { privateKey, certPem } = this.extrairCertificado(certificado);
    const xmlAssinado = this.assinarXml(xmlConsulta, privateKey, certPem);
    const soapEnvelope = this.montarSoapEnvelope(xmlAssinado, tpAmb);

    const endpoint = ambiente === 1 ? this.endpointProducao : this.endpointHomologacao;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(endpoint, soapEnvelope, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            SOAPAction:
              'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse',
          },
          httpsAgent: this.criarAgentHttps(certificado),
          timeout: 30000,
        }),
      );

      return this.parsearResposta(data);
    } catch (err) {
      this.logger.error(`Erro ao consultar SEFAZ DF-e: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Descompacta e decodifica um documento do lote DF-e.
   */
  descompactarDocumento(xmlBase64: string): string {
    const buffer = Buffer.from(xmlBase64, 'base64');
    try {
      return gunzipSync(buffer).toString('utf-8');
    } catch {
      // Alguns documentos não são compactados
      return buffer.toString('utf-8');
    }
  }

  // ─── Privados ────────────────────────────────────────────────────────────────

  private montarXmlConsulta(
    cnpj: string,
    ultNsu: string,
    tpAmb: string,
    cUF: number,
  ): string {
    return `<distDFeInt versao="1.01" xmlns="http://www.portalfiscal.inf.br/nfe">` +
      `<tpAmb>${tpAmb}</tpAmb>` +
      `<cUFAutor>${cUF}</cUFAutor>` +
      `<CNPJ>${cnpj}</CNPJ>` +
      `<distNSU><ultNSU>${ultNsu}</ultNSU></distNSU>` +
      `</distDFeInt>`;
  }

  private montarSoapEnvelope(xmlAssinado: string, tpAmb: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>` +
      `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
      `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
      `xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
      `<soap12:Header>` +
      `<nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">` +
      `<cUF>AN</cUF><versaoDados>1.01</versaoDados>` +
      `</nfeCabecMsg>` +
      `</soap12:Header>` +
      `<soap12:Body>` +
      `<nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">` +
      `<nfeDadosMsg>${xmlAssinado}</nfeDadosMsg>` +
      `</nfeDistDFeInteresse>` +
      `</soap12:Body>` +
      `</soap12:Envelope>`;
  }

  private assinarXml(xml: string, privateKeyPem: string, certPem: string): string {
    // Adiciona Id para referência da assinatura
    const xmlComId = xml.replace('<distDFeInt ', '<distDFeInt Id="distDFeInt" ');

    // Calcula digest SHA1 do elemento
    const sign = createSign('SHA1');
    sign.update(xmlComId);
    const signature = sign.sign(privateKeyPem, 'base64');

    // Extrai apenas o corpo do certificado (sem header/footer PEM)
    const certBody = certPem
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '')
      .replace(/\n/g, '');

    const signatureXml =
      `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
      `<SignedInfo>` +
      `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<Reference URI="#distDFeInt">` +
      `<Transforms><Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></Transforms>` +
      `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<DigestValue>${this.calcularDigest(xmlComId)}</DigestValue>` +
      `</Reference>` +
      `</SignedInfo>` +
      `<SignatureValue>${signature}</SignatureValue>` +
      `<KeyInfo><X509Data><X509Certificate>${certBody}</X509Certificate></X509Data></KeyInfo>` +
      `</Signature>`;

    return xmlComId.replace('</distDFeInt>', `${signatureXml}</distDFeInt>`);
  }

  private calcularDigest(xml: string): string {
    const { createHash } = require('crypto');
    return createHash('sha1').update(xml).digest('base64');
  }

  private extrairCertificado(cert: CertificadoA1): { privateKey: string; certPem: string } {
    const pfxBuffer = Buffer.from(cert.pfxBase64, 'base64');
    const pfxDer = forge.util.createBuffer(pfxBuffer.toString('binary'));
    const pfxAsn1 = forge.asn1.fromDer(pfxDer);
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, cert.senha);

    const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag]?.[0];
    if (!certBag?.cert) throw new Error('Certificado não encontrado no PFX');

    const keyBags = pfx.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
    if (!keyBag?.key) throw new Error('Chave privada não encontrada no PFX');

    return {
      privateKey: forge.pki.privateKeyToPem(keyBag.key),
      certPem: forge.pki.certificateToPem(certBag.cert),
    };
  }

  private criarAgentHttps(cert: CertificadoA1) {
    const https = require('https');
    const pfxBuffer = Buffer.from(cert.pfxBase64, 'base64');
    return new https.Agent({ pfx: pfxBuffer, passphrase: cert.senha, rejectUnauthorized: true });
  }

  private async parsearResposta(soapXml: string): Promise<RespostaDfe> {
    const parsed = await parseStringPromise(soapXml, { explicitArray: false });

    // Navega pela estrutura SOAP
    const body =
      parsed?.['soap:Envelope']?.['soap:Body'] ??
      parsed?.['soap12:Envelope']?.['soap12:Body'] ??
      {};

    const retorno =
      body?.['nfeDistDFeInteresseResponse']?.['nfeDistDFeInteresseResult']?.['retDistDFeInt'] ??
      body?.['nfeDistDFeInteresseResult']?.['retDistDFeInt'] ??
      {};

    const cStat: string = retorno?.cStat ?? '999';
    const xMotivo: string = retorno?.xMotivo ?? 'Erro desconhecido';
    const ultNSU: string = retorno?.ultNSU ?? '000000000000000';
    const maxNSU: string = retorno?.maxNSU ?? ultNSU;

    const documentos: DocumentoDfe[] = [];
    const loteDistDFeInt = retorno?.loteDistDFeInt;

    if (loteDistDFeInt) {
      const docZip = loteDistDFeInt?.docZip;
      const lista = Array.isArray(docZip) ? docZip : docZip ? [docZip] : [];

      for (const doc of lista) {
        documentos.push({
          nsu: doc?.['$']?.NSU ?? doc?.NSU ?? '',
          schema: doc?.['$']?.schema ?? doc?.schema ?? '',
          xmlBase64: doc?.['_'] ?? doc?.['#text'] ?? '',
        });
      }
    }

    return { cStat, xMotivo, ultNSU, maxNSU, documentos };
  }
}
