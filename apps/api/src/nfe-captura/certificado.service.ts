import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as forge from 'node-forge';
import { Empresa } from '../entities/empresa.entity';
import { CertCryptoService } from './cert-crypto.service';
import { CertificadoA1 } from './sefaz-dfe.service';

@Injectable()
export class CertificadoService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresaRepo: Repository<Empresa>,
    private readonly crypto: CertCryptoService,
  ) {}

  async salvarCertificado(
    empresaId: string,
    pfxBuffer: Buffer,
    senha: string,
  ): Promise<{ titular: string; validade: Date }> {
    // Valida o certificado antes de salvar
    const { titular, validade, cnpj: cnpjCert } = this.validarPfx(pfxBuffer, senha);

    // Valida que o CNPJ do certificado corresponde ao da empresa
    if (cnpjCert) {
      const empresa = await this.empresaRepo.findOne({ where: { id: empresaId } });
      if (empresa) {
        const cnpjEmpresa = empresa.cnpj.replace(/\D/g, '');
        if (cnpjCert !== cnpjEmpresa) {
          throw new BadRequestException(
            `O CNPJ do certificado (${cnpjCert}) não corresponde ao CNPJ da empresa (${cnpjEmpresa}).`,
          );
        }
      }
    }

    const pfxBase64 = pfxBuffer.toString('base64');

    await this.empresaRepo
      .createQueryBuilder()
      .update(Empresa)
      .set({
        cert_pfx_encrypted: this.crypto.encrypt(pfxBase64),
        cert_senha_encrypted: this.crypto.encrypt(senha),
        cert_validade: validade,
        cert_titular: titular,
      })
      .where('id = :id', { id: empresaId })
      .execute();

    return { titular, validade };
  }

  async infoCertificado(empresaId: string): Promise<{
    configurado: boolean;
    titular: string | null;
    validade: Date | null;
    vencido: boolean;
  }> {
    const empresa = await this.empresaRepo
      .createQueryBuilder('e')
      .select(['e.id', 'e.cert_titular', 'e.cert_validade'])
      .where('e.id = :id', { id: empresaId })
      .getOne();

    if (!empresa) throw new NotFoundException('Empresa não encontrada');

    const configurado = !!empresa.cert_titular;
    const vencido = empresa.cert_validade ? empresa.cert_validade < new Date() : false;

    return {
      configurado,
      titular: empresa.cert_titular ?? null,
      validade: empresa.cert_validade ?? null,
      vencido,
    };
  }

  async removerCertificado(empresaId: string): Promise<void> {
    await this.empresaRepo
      .createQueryBuilder()
      .update(Empresa)
      .set({
        cert_pfx_encrypted: null,
        cert_senha_encrypted: null,
        cert_validade: null,
        cert_titular: null,
      })
      .where('id = :id', { id: empresaId })
      .execute();
  }

  /** Recupera o certificado descriptografado para uso na comunicação SEFAZ */
  async obterCertificado(empresaId: string): Promise<CertificadoA1 | null> {
    const empresa = await this.empresaRepo
      .createQueryBuilder('e')
      .addSelect('e.cert_pfx_encrypted')
      .addSelect('e.cert_senha_encrypted')
      .where('e.id = :id', { id: empresaId })
      .getOne();

    if (!empresa?.cert_pfx_encrypted || !empresa?.cert_senha_encrypted) return null;

    return {
      pfxBase64: this.crypto.decrypt(empresa.cert_pfx_encrypted),
      senha: this.crypto.decrypt(empresa.cert_senha_encrypted),
    };
  }

  private validarPfx(pfxBuffer: Buffer, senha: string): { titular: string; validade: Date; cnpj: string | null } {
    try {
      const pfxDer = forge.util.createBuffer(pfxBuffer.toString('binary'));
      const pfxAsn1 = forge.asn1.fromDer(pfxDer);
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, senha);

      const bags = pfx.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = bags[forge.pki.oids.certBag]?.[0];
      if (!certBag?.cert) throw new Error('Certificado não encontrado');

      const cert = certBag.cert;
      const cn = cert.subject.getField('CN')?.value ?? 'Desconhecido';
      const validade = cert.validity.notAfter;

      if (validade < new Date()) {
        throw new BadRequestException('Certificado expirado. Envie um certificado válido.');
      }

      // Extrai CNPJ do certificado (OID 2.16.76.1.3.3 na extensão subjectAltName)
      const cnpj = this.extrairCnpjDoCertificado(cert);

      return { titular: cn, validade, cnpj };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Certificado inválido ou senha incorreta');
    }
  }

  /**
   * Extrai o CNPJ do certificado digital A1 (e-CNPJ).
   * O CNPJ fica no campo otherName da extensão subjectAltName, OID 2.16.76.1.3.3.
   * Fallback: tenta extrair do CN (formato "...:<CNPJ>").
   */
  private extrairCnpjDoCertificado(cert: forge.pki.Certificate): string | null {
    try {
      const sanExt = cert.getExtension('subjectAltName') as any;
      if (sanExt?.altNames) {
        for (const alt of sanExt.altNames) {
          // otherName com OID 2.16.76.1.3.3 contém o CNPJ
          if (alt.type === 0 && alt.value) {
            // O valor pode estar em ASN1; tenta extrair 14 dígitos do CNPJ
            const raw = typeof alt.value === 'string'
              ? alt.value
              : JSON.stringify(alt.value);
            const match = raw.match(/\d{14}/);
            if (match) return match[0];
          }
        }
      }
    } catch {
      // Extensão não encontrada ou formato inesperado
    }

    // Fallback: tenta extrair do CN (padrão "NOME:CNPJ")
    const cn: string = cert.subject.getField('CN')?.value ?? '';
    const cnpjMatch = cn.match(/(\d{14})/);
    return cnpjMatch ? cnpjMatch[1] : null;
  }
}
