import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrega, StatusEntrega } from '../entities/entrega.entity';
import { Imagem, TipoImagem } from '../entities/imagem.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { CriarEntregaDto, FinalizarEntregaDto } from './criar-entrega.dto';
import { FiltrosEntregaDto } from './filtros-entrega.dto';
import { MeuDanfeService } from './meudanfe.service';
import { NotificacoesService } from '../notificacoes/notificacoes.service';
import { TipoNotificacao } from '../entities/notificacao.entity';

export interface ListagemEntregasResponse {
  data: Entrega[];
  total: number;
  page: number;
  limit: number;
}

function gerarCodigo(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += chars[Math.floor(Math.random() * chars.length)];
  }
  return codigo;
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
    private readonly notificacoesService: NotificacoesService,
  ) {}

  async criar(dto: CriarEntregaDto, entregadorId: string): Promise<Entrega> {
    const isPendente = dto.status === StatusEntrega.PENDENTE;

    if (!isPendente) {
      // Validação só para envio final — campos padrão legados
      const temCanhoto = dto.imagens?.some((i) => i.tipo === TipoImagem.CANHOTO);
      const temLocal = dto.imagens?.some((i) => i.tipo === TipoImagem.LOCAL);
      if (!temCanhoto || !temLocal) {
        throw new BadRequestException(
          'É obrigatório enviar pelo menos 1 imagem do tipo CANHOTO e 1 do tipo LOCAL',
        );
      }
    }

    const entrega = this.entregaRepository.create({
      chave_nfe: dto.chave_nfe,
      entregador_id: entregadorId,
      data_hora: new Date(),
      latitude: dto.latitude,
      longitude: dto.longitude,
      status: isPendente ? StatusEntrega.PENDENTE : StatusEntrega.ENVIADO,
      codigo: await this.gerarCodigoUnico(),
    });

    const entregaSalva = await this.entregaRepository.save(entrega);

    if (dto.imagens?.length) {
      const TIPOS_VALIDOS = new Set(['CANHOTO', 'LOCAL']);
      const imagens = dto.imagens.map((imgDto) =>
        this.imagemRepository.create({
          entrega_id: entregaSalva.id,
          tipo: TIPOS_VALIDOS.has(imgDto.tipo) ? (imgDto.tipo as TipoImagem) : null,
          campo_key: imgDto.tipo,
          url_arquivo: imgDto.url_arquivo,
        }),
      );
      entregaSalva.imagens = await this.imagemRepository.save(imagens);
    } else {
      entregaSalva.imagens = [];
    }

    if (!isPendente) {
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
    }

    return entregaSalva;
  }

  async listarPendentesEntregador(entregadorId: string): Promise<Entrega[]> {
    return this.entregaRepository
      .createQueryBuilder('entrega')
      .leftJoinAndSelect('entrega.imagens', 'imagens')
      .where('entrega.entregador_id = :entregadorId', { entregadorId })
      .andWhere('entrega.status = :status', { status: StatusEntrega.PENDENTE })
      .orderBy('entrega.data_hora', 'DESC')
      .getMany();
  }

  async finalizar(id: string, dto: FinalizarEntregaDto, entregadorId: string): Promise<Entrega> {
    const entrega = await this.entregaRepository.findOne({
      where: { id },
      relations: ['imagens'],
    });

    if (!entrega) throw new NotFoundException(`Entrega ${id} não encontrada`);
    if (entrega.entregador_id !== entregadorId) throw new ForbiddenException('Acesso negado');
    if (entrega.status !== StatusEntrega.PENDENTE) {
      throw new BadRequestException('Apenas entregas pendentes podem ser finalizadas');
    }

    // Adiciona as novas imagens (mantém as já existentes)
    const TIPOS_VALIDOS = new Set(['CANHOTO', 'LOCAL']);
    const novasImagens = dto.imagens.map((imgDto) =>
      this.imagemRepository.create({
        entrega_id: id,
        tipo: TIPOS_VALIDOS.has(imgDto.tipo) ? (imgDto.tipo as TipoImagem) : null,
        campo_key: imgDto.tipo,
        url_arquivo: imgDto.url_arquivo,
      }),
    );
    await this.imagemRepository.save(novasImagens);

    await this.entregaRepository.update(id, {
      status: StatusEntrega.ENVIADO,
      latitude: dto.latitude,
      longitude: dto.longitude,
      data_hora: new Date(),
      comentario_reativacao: null,
    });

    this.meuDanfeService.obterDadosCompletos(entrega.chave_nfe).then(async ({ pdfBase64, dadosNfe }) => {
      if (pdfBase64) await this.entregaRepository.update(id, { danfe_pdf_base64: pdfBase64 });
      if (dadosNfe) {
        const existente = await this.dadosNfeRepository.findOne({ where: { entrega_id: id } });
        if (!existente) {
          await this.dadosNfeRepository.save(
            this.dadosNfeRepository.create({ ...dadosNfe, entrega_id: id }),
          );
        }
      }
    });

    return this.entregaRepository.findOne({ where: { id }, relations: ['imagens'] }) as Promise<Entrega>;
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
      codigo: e.codigo,
      chave_nfe: e.chave_nfe,
      entregador_id: e.entregador_id,
      entregador_nome: e.entregador?.nome ?? '',
      data_hora: e.data_hora,
      latitude: e.latitude,
      longitude: e.longitude,
      status: e.status,
      conferida: e.conferida,
      conferida_em: e.conferida_em,
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
      codigo: entrega.codigo,
      chave_nfe: entrega.chave_nfe,
      entregador_id: entrega.entregador_id,
      entregador_nome: entrega.entregador?.nome ?? '',
      data_hora: entrega.data_hora,
      latitude: parseFloat(Number(entrega.latitude).toFixed(6)),
      longitude: parseFloat(Number(entrega.longitude).toFixed(6)),
      status: entrega.status,
      conferida: entrega.conferida,
      conferida_em: entrega.conferida_em,
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

  async conferir(id: string, conferida: boolean): Promise<void> {
    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException(`Entrega ${id} não encontrada`);
    await this.entregaRepository.update(id, {
      conferida,
      conferida_em: conferida ? new Date() : null,
    });
  }

  async excluir(id: string): Promise<void> {
    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException(`Entrega com id ${id} não encontrada`);
    await this.entregaRepository.delete(id);
  }

  async excluirPendente(id: string, entregadorId: string): Promise<void> {
    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException(`Entrega ${id} não encontrada`);
    if (entrega.entregador_id !== entregadorId) throw new ForbiddenException('Acesso negado');
    if (entrega.status !== StatusEntrega.PENDENTE) {
      throw new BadRequestException('Só é possível excluir entregas com status PENDENTE');
    }
    await this.entregaRepository.delete(id);
  }

  async limparCampos(id: string, campos: { chave_nfe?: boolean; localizacao?: boolean }): Promise<void> {
    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException(`Entrega ${id} não encontrada`);

    const updates: Partial<Entrega> = {};
    if (campos.chave_nfe) updates.chave_nfe = '' as any;
    if (campos.localizacao) { updates.latitude = 0 as any; updates.longitude = 0 as any; }

    if (Object.keys(updates).length) {
      await this.entregaRepository.update(id, updates);
    }
  }

  async excluirImagem(imagemId: string, empresa_id?: string | null): Promise<void> {
    const imagem = await this.imagemRepository
      .createQueryBuilder('imagem')
      .innerJoin('imagem.entrega', 'entrega')
      .innerJoin('entrega.entregador', 'entregador')
      .where('imagem.id = :imagemId', { imagemId })
      .andWhere(empresa_id ? 'entregador.empresa_id = :empresa_id' : '1=1', { empresa_id })
      .getOne();

    if (!imagem) throw new NotFoundException('Imagem não encontrada');
    await this.imagemRepository.delete(imagemId);
  }

  async reativar(id: string, comentario?: string): Promise<void> {    const entrega = await this.entregaRepository.findOne({ where: { id } });
    if (!entrega) throw new NotFoundException(`Entrega ${id} não encontrada`);
    if (entrega.status === StatusEntrega.PENDENTE) {
      throw new BadRequestException('A entrega já está pendente');
    }

    await this.entregaRepository.update(id, {
      status: StatusEntrega.PENDENTE,
      comentario_reativacao: comentario?.trim() || null,
    });

    const msg = comentario?.trim()
      ? `Sua entrega ${entrega.codigo ?? id.slice(0, 6)} foi reativada pelo administrador. Motivo: ${comentario.trim()}`
      : `Sua entrega ${entrega.codigo ?? id.slice(0, 6)} foi reativada pelo administrador e precisa ser concluída.`;

    await this.notificacoesService.criar(
      entrega.entregador_id,
      TipoNotificacao.REATIVACAO,
      msg,
      id,
    );
  }

  private async gerarCodigoUnico(): Promise<string> {
    let codigo: string;
    let tentativas = 0;
    do {
      codigo = gerarCodigo();
      const existe = await this.entregaRepository.findOne({ where: { codigo } });
      if (!existe) return codigo;
      tentativas++;
    } while (tentativas < 10);
    throw new Error('Não foi possível gerar um código único para a entrega');
  }
}

export interface EntregaDetalheResponse {
  id: string;
  codigo: string | null;
  chave_nfe: string;
  entregador_id: string;
  entregador_nome: string;
  data_hora: Date;
  latitude: number;
  longitude: number;
  status: string;
  conferida: boolean;
  conferida_em: Date | null;
  criado_em: Date;
  imagens: import('../entities/imagem.entity').Imagem[];
  danfe_pdf_base64: string | null;
  dados_nfe: DadosNfe | null;
}
