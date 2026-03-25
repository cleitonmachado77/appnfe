import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrega, StatusEntrega } from '../entities/entrega.entity';
import { Imagem, TipoImagem } from '../entities/imagem.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { CriarEntregaDto } from './criar-entrega.dto';
import { FiltrosEntregaDto } from './filtros-entrega.dto';
import { MeuDanfeService } from './meudanfe.service';

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
    @InjectRepository(DadosNfe)
    private readonly dadosNfeRepository: Repository<DadosNfe>,
    private readonly meuDanfeService: MeuDanfeService,
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

    // Busca PDF + dados XML de forma assíncrona (não bloqueia a resposta)
    this.meuDanfeService.obterDadosCompletos(dto.chave_nfe).then(async ({ pdfBase64, dadosNfe }) => {
      const updates: Partial<Entrega> = {};
      if (pdfBase64) updates.danfe_pdf_base64 = pdfBase64;
      if (Object.keys(updates).length) {
        await this.entregaRepository.update(entregaSalva.id, updates);
      }
      if (dadosNfe) {
        await this.dadosNfeRepository.save(
          this.dadosNfeRepository.create({ ...dadosNfe, entrega_id: entregaSalva.id }),
        );
      }
    });

    return entregaSalva;
  }

  async listar(filtros: FiltrosEntregaDto, empresa_id?: string | null): Promise<ListagemEntregasResponse> {
    const page = filtros.page ?? 1;
    const limit = filtros.limit ?? 20;

    const qb = this.entregaRepository
      .createQueryBuilder('entrega')
      .innerJoinAndSelect('entrega.entregador', 'entregador')
      .leftJoinAndSelect('entrega.imagens', 'imagens')
      .leftJoinAndSelect('entrega.dadosNfe', 'dadosNfe');

    if (empresa_id) {
      qb.andWhere('entregador.empresa_id = :empresa_id', { empresa_id });
    }
    if (filtros.entregador_id) {
      qb.andWhere('entrega.entregador_id = :entregadorId', { entregadorId: filtros.entregador_id });
    }
    if (filtros.data_inicio && filtros.data_fim) {
      qb.andWhere('entrega.data_hora BETWEEN :dataInicio AND :dataFim', { dataInicio: filtros.data_inicio, dataFim: filtros.data_fim });
    } else if (filtros.data_inicio) {
      qb.andWhere('entrega.data_hora >= :dataInicio', { dataInicio: filtros.data_inicio });
    } else if (filtros.data_fim) {
      qb.andWhere('entrega.data_hora <= :dataFim', { dataFim: filtros.data_fim });
    }
    if (filtros.chave_nfe) {
      qb.andWhere('entrega.chave_nfe LIKE :chaveNfe', { chaveNfe: `%${filtros.chave_nfe}%` });
    }
    if (filtros.cliente_cnpj) {
      qb.andWhere('(dadosNfe.emit_cnpj = :cnpj OR dadosNfe.dest_cnpj_cpf = :cnpj)', { cnpj: filtros.cliente_cnpj });
    }

    qb.orderBy('entrega.data_hora', 'DESC').skip((page - 1) * limit).take(limit);
    const [rows, total] = await qb.getManyAndCount();

    const data = rows.map((e) => ({
      id: e.id,
      chave_nfe: e.chave_nfe,
      entregador_id: e.entregador_id,
      entregador_nome: e.entregador?.nome ?? '',
      data_hora: e.data_hora,
      latitude: e.latitude,
      longitude: e.longitude,
      status: e.status,
      criado_em: e.criado_em,
      imagens: e.imagens ?? [],
      danfe_pdf_base64: e.danfe_pdf_base64 ?? null,
      dados_nfe: e.dadosNfe ?? null,
    }));

    return { data: data as any, total, page, limit };
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

    const dadosNfe = await this.dadosNfeRepository.findOne({
      where: { entrega_id: id },
    });

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
      danfe_pdf_base64: entrega.danfe_pdf_base64 ?? null,
      dados_nfe: dadosNfe ?? null,
    };
  }

  async reprocessarDanfe(id: string): Promise<{ danfe_pdf_base64: string | null; dados_nfe: DadosNfe | null }> {    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) {
      throw new NotFoundException(`Entrega com id ${id} não encontrada`);
    }
    const { pdfBase64, dadosNfe } = await this.meuDanfeService.obterDadosCompletos(entrega.chave_nfe);
    if (pdfBase64) {
      await this.entregaRepository.update(id, { danfe_pdf_base64: pdfBase64 });
    }
    let dadosSalvos: DadosNfe | null = null;
    if (dadosNfe) {
      const existente = await this.dadosNfeRepository.findOne({ where: { entrega_id: id } });
      if (existente) {
        await this.dadosNfeRepository.update(existente.id, dadosNfe);
        dadosSalvos = { ...existente, ...dadosNfe } as DadosNfe;
      } else {
        dadosSalvos = await this.dadosNfeRepository.save(
          this.dadosNfeRepository.create({ ...dadosNfe, entrega_id: id }),
        );
      }
    }
    return { danfe_pdf_base64: pdfBase64, dados_nfe: dadosSalvos };
  }

  async excluir(id: string): Promise<void> {
    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException(`Entrega com id ${id} não encontrada`);
    await this.entregaRepository.delete(id);
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
  danfe_pdf_base64: string | null;
  dados_nfe: DadosNfe | null;
}
