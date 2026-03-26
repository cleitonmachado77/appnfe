import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoImagem } from '../entities/campo-imagem.entity';

export interface CriarCampoDto {
  key: string;
  label: string;
  obrigatorio?: boolean;
  ordem?: number;
}

export interface AtualizarCampoDto {
  label?: string;
  obrigatorio?: boolean;
  ordem?: number;
  ativo?: boolean;
}

@Injectable()
export class CamposImagemService {
  constructor(
    @InjectRepository(CampoImagem)
    private readonly repo: Repository<CampoImagem>,
  ) {}

  async listar(empresa_id: string | null): Promise<CampoImagem[]> {
    if (!empresa_id) return [];
    return this.repo.find({
      where: { empresa_id },
      order: { ordem: 'ASC', criado_em: 'ASC' },
    });
  }

  async listarAtivos(empresa_id: string | null): Promise<CampoImagem[]> {
    if (!empresa_id) return [];
    return this.repo.find({
      where: { empresa_id, ativo: true },
      order: { ordem: 'ASC', criado_em: 'ASC' },
    });
  }

  async criar(empresa_id: string, dto: CriarCampoDto): Promise<CampoImagem> {
    const key = dto.key.toUpperCase().replace(/\s+/g, '_');

    const existe = await this.repo.findOne({ where: { empresa_id, key } });
    if (existe) throw new ConflictException(`Já existe um campo com a chave "${key}"`);

    const campo = this.repo.create({
      empresa_id,
      key,
      label: dto.label,
      obrigatorio: dto.obrigatorio ?? true,
      ordem: dto.ordem ?? 0,
      ativo: true,
    });

    return this.repo.save(campo);
  }

  async atualizar(id: string, empresa_id: string, dto: AtualizarCampoDto): Promise<CampoImagem> {
    const campo = await this.repo.findOne({ where: { id, empresa_id } });
    if (!campo) throw new NotFoundException('Campo não encontrado');

    Object.assign(campo, dto);
    return this.repo.save(campo);
  }

  async excluir(id: string, empresa_id: string): Promise<void> {
    const campo = await this.repo.findOne({ where: { id, empresa_id } });
    if (!campo) throw new NotFoundException('Campo não encontrado');

    const CAMPOS_PADRAO = ['CANHOTO', 'LOCAL'];
    if (CAMPOS_PADRAO.includes(campo.key)) {
      throw new BadRequestException('Os campos padrão (CANHOTO e LOCAL) não podem ser excluídos, apenas desativados');
    }

    await this.repo.delete(id);
  }

  /** Garante que os campos padrão existam para uma empresa recém-criada */
  async inicializarPadrao(empresa_id: string): Promise<void> {
    const padrao = [
      { key: 'CANHOTO', label: 'Foto do Canhoto', ordem: 0 },
      { key: 'LOCAL', label: 'Foto do Local de Entrega', ordem: 1 },
    ];

    for (const p of padrao) {
      const existe = await this.repo.findOne({ where: { empresa_id, key: p.key } });
      if (!existe) {
        await this.repo.save(this.repo.create({ empresa_id, ...p, obrigatorio: true, ativo: true }));
      }
    }
  }
}
