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
    const { titular, validade } = this.validarPfx(pfxBuffer, senha);

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
      .select(['e.id', 'e.cert_pfx_encrypted', 'e.cert_senha_encrypted', 'e.cert_validade'])
      .where('e.id = :id', { id: empresaId })
      .getOne();

    if (!empresa?.cert_pfx_encrypted || !empresa?.cert_senha_encrypted) return null;

    return {
      pfxBase64: this.crypto.decrypt(empresa.cert_pfx_encrypted),
      senha: this.crypto.decrypt(empresa.cert_senha_encrypted),
    };
  }

  private validarPfx(pfxBuffer: Buffer, senha: string): { titular: string; validade: Date } {
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

      return { titular: cn, validade };
    } catch {
      throw new BadRequestException('Certificado inválido ou senha incorreta');
    }
  }
}
