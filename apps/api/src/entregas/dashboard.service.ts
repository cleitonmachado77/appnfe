import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrega } from '../entities/entrega.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';

export interface DashboardFiltros {
  data_inicio?: string; // ISO date string
  data_fim?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Entrega)
    private readonly entregaRepo: Repository<Entrega>,
    @InjectRepository(DadosNfe)
    private readonly dadosNfeRepo: Repository<DadosNfe>,
  ) {}

  async getDashboard(filtros: DashboardFiltros = {}) {
    const [kpis, entregasPorPeriodo, entregasPorEntregador, entregasPorStatus,
      faturamentoPorPeriodo, distribuicaoValores, composicaoValores,
      topEmitentes, topDestinatarios, notasPorUf, naturezaOperacao,
      itensPorNota, tempoPorPeriodo, valorPorEntregador, entregas] =
      await Promise.all([
        this.getKpis(filtros),
        this.getEntregasPorPeriodo(filtros),
        this.getEntregasPorEntregador(filtros),
        this.getEntregasPorStatus(filtros),
        this.getFaturamentoPorPeriodo(filtros),
        this.getDistribuicaoValores(filtros),
        this.getComposicaoValores(filtros),
        this.getTopEmitentes(filtros),
        this.getTopDestinatarios(filtros),
        this.getNotasPorUf(filtros),
        this.getNaturezaOperacao(filtros),
        this.getItensPorNota(filtros),
        this.getTempoPorPeriodo(filtros),
        this.getValorPorEntregador(filtros),
        this.getEntregasGeo(filtros),
      ]);

    return {
      kpis, entregasPorPeriodo, entregasPorEntregador, entregasPorStatus,
      faturamentoPorPeriodo, distribuicaoValores, composicaoValores,
      topEmitentes, topDestinatarios, notasPorUf, naturezaOperacao,
      itensPorNota, tempoPorPeriodo, valorPorEntregador, entregas,
    };
  }

  // Aplica filtro de data em query builder de entregas
  private applyEntregaFilter(qb: any, filtros: DashboardFiltros, alias = 'e') {
    if (filtros.data_inicio) {
      qb.andWhere(`${alias}.data_hora >= :dataInicio`, { dataInicio: filtros.data_inicio });
    }
    if (filtros.data_fim) {
      qb.andWhere(`${alias}.data_hora <= :dataFim`, { dataFim: filtros.data_fim });
    }
    return qb;
  }

  // Aplica filtro de data em query builder de dados_nfe (via join com entrega)
  private applyNfeFilter(qb: any, filtros: DashboardFiltros, entregaAlias = 'e') {
    if (filtros.data_inicio) {
      qb.andWhere(`${entregaAlias}.data_hora >= :dataInicio`, { dataInicio: filtros.data_inicio });
    }
    if (filtros.data_fim) {
      qb.andWhere(`${entregaAlias}.data_hora <= :dataFim`, { dataFim: filtros.data_fim });
    }
    return qb;
  }

  private async getKpis(filtros: DashboardFiltros) {
    const qbE = this.entregaRepo.createQueryBuilder('e');
    this.applyEntregaFilter(qbE, filtros);
    const totalEntregas = await qbE.getCount();

    const qbV = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e').select('SUM(d.valor_total)', 'total');
    this.applyNfeFilter(qbV, filtros);
    const valorResult = await qbV.getRawOne();
    const valorTotal = parseFloat(valorResult?.total ?? '0') || 0;
    const ticketMedio = totalEntregas > 0 ? valorTotal / totalEntregas : 0;

    const qbNfe = this.entregaRepo.createQueryBuilder('e').select('COUNT(DISTINCT e.chave_nfe)', 'count');
    this.applyEntregaFilter(qbNfe, filtros);
    const nfeUnicas = await qbNfe.getRawOne();

    const qbStatus = this.entregaRepo.createQueryBuilder('e').select('e.status', 'status').addSelect('COUNT(*)', 'count').groupBy('e.status');
    this.applyEntregaFilter(qbStatus, filtros);
    const statusResult = await qbStatus.getRawMany();

    const qbPeso = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e').select('SUM(d.peso_bruto)', 'total');
    this.applyNfeFilter(qbPeso, filtros);
    const pesoResult = await qbPeso.getRawOne();
    const pesoTotal = parseFloat(pesoResult?.total ?? '0') || 0;

    const qbTempo = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('AVG(EXTRACT(EPOCH FROM (e.data_hora - d.data_emissao)) / 3600)', 'horas')
      .where('d.data_emissao IS NOT NULL');
    this.applyNfeFilter(qbTempo, filtros);
    const tempoResult = await qbTempo.getRawOne();
    const tempoMedioHoras = parseFloat(tempoResult?.horas ?? '0') || 0;

    return {
      totalEntregas,
      valorTotal,
      ticketMedio,
      nfeUnicas: parseInt(nfeUnicas?.count ?? '0'),
      entregasPorStatus: statusResult.map((r) => ({ status: r.status, count: parseInt(r.count) })),
      pesoTotal,
      tempoMedioHoras: Math.round(tempoMedioHoras * 10) / 10,
    };
  }

  private async getEntregasPorPeriodo(filtros: DashboardFiltros) {
    const qb = this.entregaRepo.createQueryBuilder('e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'data')
      .addSelect('COUNT(*)', 'count')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'ASC');
    this.applyEntregaFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ data: r.data, count: parseInt(r.count) }));
  }

  private async getEntregasPorEntregador(filtros: DashboardFiltros) {
    const qb = this.entregaRepo.createQueryBuilder('e')
      .innerJoin('e.entregador', 'u')
      .leftJoin('e.dadosNfe', 'd')
      .select('u.nome', 'nome')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CAST(d.valor_total AS DECIMAL))', 'valor')
      .groupBy('u.nome')
      .orderBy('count', 'DESC');
    this.applyEntregaFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ nome: r.nome, count: parseInt(r.count), valor: parseFloat(r.valor ?? '0') || 0 }));
  }

  private async getEntregasPorStatus(filtros: DashboardFiltros) {
    const qb = this.entregaRepo.createQueryBuilder('e')
      .select('e.status', 'status').addSelect('COUNT(*)', 'count').groupBy('e.status');
    this.applyEntregaFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ status: r.status, count: parseInt(r.count) }));
  }

  private async getFaturamentoPorPeriodo(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'data')
      .addSelect('SUM(d.valor_total)', 'valor')
      .where('d.valor_total IS NOT NULL')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'ASC');
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ data: r.data, valor: parseFloat(r.valor) || 0 }));
  }

  private async getDistribuicaoValores(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.valor_total', 'valor').where('d.valor_total IS NOT NULL');
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    const faixas = [
      { label: 'Até R$500', min: 0, max: 500 },
      { label: 'R$500–2k', min: 500, max: 2000 },
      { label: 'R$2k–10k', min: 2000, max: 10000 },
      { label: 'R$10k–50k', min: 10000, max: 50000 },
      { label: 'Acima R$50k', min: 50000, max: Infinity },
    ];
    return faixas.map((f) => ({
      faixa: f.label,
      count: rows.filter((r) => { const v = parseFloat(r.valor); return v >= f.min && v < f.max; }).length,
    }));
  }

  private async getComposicaoValores(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('SUM(d.valor_produtos)', 'produtos')
      .addSelect('SUM(d.valor_frete)', 'frete')
      .addSelect('SUM(d.valor_desconto)', 'desconto');
    this.applyNfeFilter(qb, filtros);
    const row = await qb.getRawOne();
    return {
      produtos: parseFloat(row?.produtos ?? '0') || 0,
      frete: parseFloat(row?.frete ?? '0') || 0,
      desconto: parseFloat(row?.desconto ?? '0') || 0,
    };
  }

  private async getTopEmitentes(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.emit_nome', 'nome').addSelect('d.emit_cnpj', 'cnpj')
      .addSelect('COUNT(*)', 'count').addSelect('SUM(d.valor_total)', 'valor')
      .where('d.emit_nome IS NOT NULL').groupBy('d.emit_nome, d.emit_cnpj')
      .orderBy('count', 'DESC').limit(10);
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ nome: r.nome, cnpj: r.cnpj, count: parseInt(r.count), valor: parseFloat(r.valor ?? '0') || 0 }));
  }

  private async getTopDestinatarios(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.dest_nome', 'nome').addSelect('d.dest_cnpj_cpf', 'cnpj_cpf')
      .addSelect('COUNT(*)', 'count').addSelect('SUM(d.valor_total)', 'valor')
      .where('d.dest_nome IS NOT NULL').groupBy('d.dest_nome, d.dest_cnpj_cpf')
      .orderBy('count', 'DESC').limit(10);
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ nome: r.nome, cnpj_cpf: r.cnpj_cpf, count: parseInt(r.count), valor: parseFloat(r.valor ?? '0') || 0 }));
  }

  private async getNotasPorUf(filtros: DashboardFiltros) {
    const qbEmit = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.emit_uf', 'uf').addSelect('COUNT(*)', 'count')
      .where('d.emit_uf IS NOT NULL').groupBy('d.emit_uf').orderBy('count', 'DESC');
    this.applyNfeFilter(qbEmit, filtros);

    const qbDest = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.dest_uf', 'uf').addSelect('COUNT(*)', 'count')
      .where('d.dest_uf IS NOT NULL').groupBy('d.dest_uf').orderBy('count', 'DESC');
    this.applyNfeFilter(qbDest, filtros);

    const [emit, dest] = await Promise.all([qbEmit.getRawMany(), qbDest.getRawMany()]);
    return {
      emitente: emit.map((r) => ({ uf: r.uf, count: parseInt(r.count) })),
      destinatario: dest.map((r) => ({ uf: r.uf, count: parseInt(r.count) })),
    };
  }

  private async getNaturezaOperacao(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.natureza_operacao', 'natureza').addSelect('COUNT(*)', 'count')
      .where('d.natureza_operacao IS NOT NULL').groupBy('d.natureza_operacao')
      .orderBy('count', 'DESC').limit(10);
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ natureza: r.natureza, count: parseInt(r.count) }));
  }

  private async getItensPorNota(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select('d.quantidade_itens', 'itens').where('d.quantidade_itens IS NOT NULL');
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    const faixas = [
      { label: '1 item', min: 1, max: 1 },
      { label: '2–5', min: 2, max: 5 },
      { label: '6–10', min: 6, max: 10 },
      { label: '11–20', min: 11, max: 20 },
      { label: '21+', min: 21, max: Infinity },
    ];
    return faixas.map((f) => ({
      faixa: f.label,
      count: rows.filter((r) => { const v = parseInt(r.itens); return v >= f.min && v <= f.max; }).length,
    }));
  }

  private async getTempoPorPeriodo(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'data')
      .addSelect('AVG(EXTRACT(EPOCH FROM (e.data_hora - d.data_emissao)) / 3600)', 'horas')
      .where('d.data_emissao IS NOT NULL')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'ASC');
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ data: r.data, horas: Math.round(parseFloat(r.horas) * 10) / 10 || 0 }));
  }

  private async getValorPorEntregador(filtros: DashboardFiltros) {
    const qb = this.dadosNfeRepo.createQueryBuilder('d').innerJoin('d.entrega', 'e').innerJoin('e.entregador', 'u')
      .select('u.nome', 'nome').addSelect('SUM(d.valor_total)', 'valor').addSelect('COUNT(*)', 'count')
      .where('d.valor_total IS NOT NULL').groupBy('u.nome').orderBy('valor', 'DESC');
    this.applyNfeFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({ nome: r.nome, valor: parseFloat(r.valor ?? '0') || 0, count: parseInt(r.count) }));
  }

  private async getEntregasGeo(filtros: DashboardFiltros) {
    const qb = this.entregaRepo.createQueryBuilder('e').leftJoin('e.dadosNfe', 'd')
      .select('e.latitude', 'lat').addSelect('e.longitude', 'lng')
      .addSelect('d.valor_total', 'valor').addSelect('d.dest_nome', 'dest_nome')
      .addSelect('e.chave_nfe', 'chave_nfe')
      .where('e.latitude IS NOT NULL AND e.longitude IS NOT NULL');
    this.applyEntregaFilter(qb, filtros);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      lat: parseFloat(r.lat), lng: parseFloat(r.lng),
      valor: parseFloat(r.valor ?? '0') || 0,
      dest_nome: r.dest_nome ?? '', chave_nfe: r.chave_nfe,
    }));
  }
}
