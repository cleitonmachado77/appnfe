import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrega, StatusEntrega } from '../entities/entrega.entity';
import { Imagem, TipoImagem } from '../entities/imagem.entity';
import { CriarEntregaDto } from './criar-entrega.dto';
import { FiltrosEntregaDto } from './filtros-entrega.dto';

export interface ListagemEntregasResponse {
  data: Entrega[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class EntregasService {
  constructor(
    @InjectRepository(Entrega)
    private readonly entregaRepository: Repository<Entrega>,
    @InjectRepository(Imagem)
    private readonly imagemRepository: Repository<Imagem>,
  ) {}

  async criar(dto: CriarEntregaDto, entregadorId: string): Promise<Entrega> {
    const temCanhoto = dto.imagens.some((i) => i.tipo === TipoImagem.CANHOTO);
    const temLocal = dto.imagens.some((i) => i.tipo === TipoImagem.LOCAL);

    if (!temCanhoto || !temLocal) {
      throw new BadRequestException(
        'É obrigatório enviar pelo menos 1 imagem do tipo CANHOTO e 1 do tipo LOCAL',
      );
    }

    const entrega = this.entregaRepository.create({
      chave_nfe: dto.chave_nfe,
      entregador_id: entregadorId,
      data_hora: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      status: StatusEntrega.ENVIADO,
    });

    const entregaSalva = await this.entregaRepository.save(entrega);

    const imagens = dto.imagens.map((imgDto) =>
      this.imagemRepository.create({
        entrega_id: entregaSalva.id,
        tipo: imgDto.tipo,
        url_arquivo: imgDto.url_arquivo,
      }),
    );

    entregaSalva.imagens = await this.imagemRepository.save(imagens);

    return entregaSalva;
  }

  async listar(filtros: FiltrosEntregaDto): Promise<ListagemEntregasResponse> {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;

    const qb = this.entregaRepository
      .createQueryBuilder('entrega')
      .leftJoinAndSelect('entrega.entregador', 'entregador')
      .leftJoinAndSelect('entrega.imagens', 'imagens');

    if (filtros.entregador_id) {
      qb.andWhere('entrega.entregador_id = :entregadorId', {
        entregadorId: filtros.entregador_id,
      });
    }

    if (filtros.data_inicio && filtros.data_fim) {
      qb.andWhere('entrega.data_hora BETWEEN :dataInicio AND :dataFim', {
        dataInicio: filtros.data_inicio,
        dataFim: filtros.data_fim,
      });
    } else if (filtros.data_inicio) {
      qb.andWhere('entrega.data_hora >= :dataInicio', {
        dataInicio: filtros.data_inicio,
      });
    } else if (filtros.data_fim) {
      qb.andWhere('entrega.data_hora <= :dataFim', {
        dataFim: filtros.data_fim,
      });
    }

    if (filtros.chave_nfe) {
      qb.andWhere('entrega.chave_nfe LIKE :chaveNfe', {
        chaveNfe: `%${filtros.chave_nfe}%`,
      });
    }

    qb.orderBy('entrega.data_hora', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  async buscarPorId(id: string): Promise<EntregaDetalheResponse> {
    const entrega = await this.entregaRepository
      .createQueryBuilder('entrega')
      .leftJoinAndSelect('entrega.entregador', 'entregador')
      .leftJoinAndSelect('entrega.imagens', 'imagens')
      .where('entrega.id = :id', { id })
      .getOne();

    if (!entrega) {
      throw new NotFoundException(`Entrega com id ${id} não encontrada`);
    }

    return {
      id: entrega.id,
      chave_nfe: entrega.chave_nfe,
      entregador_id: entrega.entregador_id,
      entregador_nome: entrega.entregador?.nome ?? '',
      data_hora: entrega.data_hora,
      latitude: parseFloat(Number(entrega.latitude).toFixed(6)),
      longitude: parseFloat(Number(entrega.longitude).toFixed(6)),
      status: entrega.status,
      criado_em: entrega.criado_em,
      imagens: entrega.imagens,
    };
  }
}

export interface EntregaDetalheResponse {
  id: string;
  chave_nfe: string;
  entregador_id: string;
  entregador_nome: string;
  data_hora: Date;
  latitude: number;
  longitude: number;
  status: string;
  criado_em: Date;
  imagens: import('../entities/imagem.entity').Imagem[];
}
