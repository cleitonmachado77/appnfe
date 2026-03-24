import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entrega } from '../entities/entrega.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Entrega)
    private readonly entregaRepo: Repository<Entrega>,
    @InjectRepository(DadosNfe)
    private readonly dadosNfeRepo: Repository<DadosNfe>,
  ) {}

  async getDashboard() {
    const [kpis, entregasPorPeriodo, entregasPorEntregador, entregasPorStatus,
      faturamentoPorPeriodo, distribuicaoValores, composicaoValores,
      topEmitentes, topDestinatarios, notasPorUf, naturezaOperacao,
      itensPorNota, tempoPorPeriodo, valorPorEntregador, entregas] =
      await Promise.all([
        this.getKpis(),
        this.getEntregasPorPeriodo(),
        this.getEntregasPorEntregador(),
        this.getEntregasPorStatus(),
        this.getFaturamentoPorPeriodo(),
        this.getDistribuicaoValores(),
        this.getComposicaoValores(),
        this.getTopEmitentes(),
        this.getTopDestinatarios(),
        this.getNotasPorUf(),
        this.getNaturezaOperacao(),
        this.getItensPorNota(),
        this.getTempoPorPeriodo(),
        this.getValorPorEntregador(),
        this.getEntregasGeo(),
      ]);

    return {
      kpis,
      entregasPorPeriodo,
      entregasPorEntregador,
      entregasPorStatus,
      faturamentoPorPeriodo,
      distribuicaoValores,
      composicaoValores,
      topEmitentes,
      topDestinatarios,
      notasPorUf,
      naturezaOperacao,
      itensPorNota,
      tempoPorPeriodo,
      valorPorEntregador,
      entregas,
    };
  }

  private async getKpis() {
    const totalEntregas = await this.entregaRepo.count();

    const valorResult = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('SUM(d.valor_total)', 'total')
      .getRawOne();
    const valorTotal = parseFloat(valorResult?.total ?? '0') || 0;

    const ticketMedio = totalEntregas > 0 ? valorTotal / totalEntregas : 0;

    const nfeUnicas = await this.entregaRepo
      .createQueryBuilder('e')
      .select('COUNT(DISTINCT e.chave_nfe)', 'count')
      .getRawOne();

    const statusResult = await this.entregaRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.status')
      .getRawMany();

    const pesoResult = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('SUM(d.peso_bruto)', 'total')
      .getRawOne();
    const pesoTotal = parseFloat(pesoResult?.total ?? '0') || 0;

    // Tempo médio entre emissão e entrega (em horas)
    const tempoResult = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .innerJoin('d.entrega', 'e')
      .select('AVG(EXTRACT(EPOCH FROM (e.data_hora - d.data_emissao)) / 3600)', 'horas')
      .where('d.data_emissao IS NOT NULL')
      .getRawOne();
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

  private async getEntregasPorPeriodo() {
    const rows = await this.entregaRepo
      .createQueryBuilder('e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'data')
      .addSelect('COUNT(*)', 'count')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();
    return rows.map((r) => ({ data: r.data, count: parseInt(r.count) }));
  }

  private async getEntregasPorEntregador() {
    const rows = await this.entregaRepo
      .createQueryBuilder('e')
      .innerJoin('e.entregador', 'u')
      .select('u.nome', 'nome')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(CAST(d.valor_total AS DECIMAL))', 'valor')
      .leftJoin('e.dadosNfe', 'd')
      .groupBy('u.nome')
      .orderBy('count', 'DESC')
      .getRawMany();
    return rows.map((r) => ({
      nome: r.nome,
      count: parseInt(r.count),
      valor: parseFloat(r.valor ?? '0') || 0,
    }));
  }

  private async getEntregasPorStatus() {
    const rows = await this.entregaRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.status')
      .getRawMany();
    return rows.map((r) => ({ status: r.status, count: parseInt(r.count) }));
  }

  private async getFaturamentoPorPeriodo() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .innerJoin('d.entrega', 'e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'data')
      .addSelect('SUM(d.valor_total)', 'valor')
      .where('d.valor_total IS NOT NULL')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();
    return rows.map((r) => ({ data: r.data, valor: parseFloat(r.valor) || 0 }));
  }

  private async getDistribuicaoValores() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.valor_total', 'valor')
      .where('d.valor_total IS NOT NULL')
      .getRawMany();

    const faixas = [
      { label: 'Até R$500', min: 0, max: 500 },
      { label: 'R$500–2k', min: 500, max: 2000 },
      { label: 'R$2k–10k', min: 2000, max: 10000 },
      { label: 'R$10k–50k', min: 10000, max: 50000 },
      { label: 'Acima R$50k', min: 50000, max: Infinity },
    ];

    return faixas.map((f) => ({
      faixa: f.label,
      count: rows.filter((r) => {
        const v = parseFloat(r.valor);
        return v >= f.min && v < f.max;
      }).length,
    }));
  }

  private async getComposicaoValores() {
    const row = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('SUM(d.valor_produtos)', 'produtos')
      .addSelect('SUM(d.valor_frete)', 'frete')
      .addSelect('SUM(d.valor_desconto)', 'desconto')
      .getRawOne();
    return {
      produtos: parseFloat(row?.produtos ?? '0') || 0,
      frete: parseFloat(row?.frete ?? '0') || 0,
      desconto: parseFloat(row?.desconto ?? '0') || 0,
    };
  }

  private async getTopEmitentes() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.emit_nome', 'nome')
      .addSelect('d.emit_cnpj', 'cnpj')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(d.valor_total)', 'valor')
      .where('d.emit_nome IS NOT NULL')
      .groupBy('d.emit_nome, d.emit_cnpj')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    return rows.map((r) => ({
      nome: r.nome,
      cnpj: r.cnpj,
      count: parseInt(r.count),
      valor: parseFloat(r.valor ?? '0') || 0,
    }));
  }

  private async getTopDestinatarios() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.dest_nome', 'nome')
      .addSelect('d.dest_cnpj_cpf', 'cnpj_cpf')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(d.valor_total)', 'valor')
      .where('d.dest_nome IS NOT NULL')
      .groupBy('d.dest_nome, d.dest_cnpj_cpf')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    return rows.map((r) => ({
      nome: r.nome,
      cnpj_cpf: r.cnpj_cpf,
      count: parseInt(r.count),
      valor: parseFloat(r.valor ?? '0') || 0,
    }));
  }

  private async getNotasPorUf() {
    const emit = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.emit_uf', 'uf')
      .addSelect('COUNT(*)', 'count')
      .where('d.emit_uf IS NOT NULL')
      .groupBy('d.emit_uf')
      .orderBy('count', 'DESC')
      .getRawMany();

    const dest = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.dest_uf', 'uf')
      .addSelect('COUNT(*)', 'count')
      .where('d.dest_uf IS NOT NULL')
      .groupBy('d.dest_uf')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      emitente: emit.map((r) => ({ uf: r.uf, count: parseInt(r.count) })),
      destinatario: dest.map((r) => ({ uf: r.uf, count: parseInt(r.count) })),
    };
  }

  private async getNaturezaOperacao() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.natureza_operacao', 'natureza')
      .addSelect('COUNT(*)', 'count')
      .where('d.natureza_operacao IS NOT NULL')
      .groupBy('d.natureza_operacao')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();
    return rows.map((r) => ({ natureza: r.natureza, count: parseInt(r.count) }));
  }

  private async getItensPorNota() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .select('d.quantidade_itens', 'itens')
      .where('d.quantidade_itens IS NOT NULL')
      .getRawMany();

    const faixas = [
      { label: '1 item', min: 1, max: 1 },
      { label: '2–5', min: 2, max: 5 },
      { label: '6–10', min: 6, max: 10 },
      { label: '11–20', min: 11, max: 20 },
      { label: '21+', min: 21, max: Infinity },
    ];

    return faixas.map((f) => ({
      faixa: f.label,
      count: rows.filter((r) => {
        const v = parseInt(r.itens);
        return v >= f.min && v <= f.max;
      }).length,
    }));
  }

  private async getTempoPorPeriodo() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .innerJoin('d.entrega', 'e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'data')
      .addSelect('AVG(EXTRACT(EPOCH FROM (e.data_hora - d.data_emissao)) / 3600)', 'horas')
      .where('d.data_emissao IS NOT NULL')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM-DD')", 'ASC')
      .getRawMany();
    return rows.map((r) => ({
      data: r.data,
      horas: Math.round(parseFloat(r.horas) * 10) / 10 || 0,
    }));
  }

  private async getValorPorEntregador() {
    const rows = await this.dadosNfeRepo
      .createQueryBuilder('d')
      .innerJoin('d.entrega', 'e')
      .innerJoin('e.entregador', 'u')
      .select('u.nome', 'nome')
      .addSelect('SUM(d.valor_total)', 'valor')
      .addSelect('COUNT(*)', 'count')
      .where('d.valor_total IS NOT NULL')
      .groupBy('u.nome')
      .orderBy('valor', 'DESC')
      .getRawMany();
    return rows.map((r) => ({
      nome: r.nome,
      valor: parseFloat(r.valor ?? '0') || 0,
      count: parseInt(r.count),
    }));
  }

  private async getEntregasGeo() {
    const rows = await this.entregaRepo
      .createQueryBuilder('e')
      .leftJoin('e.dadosNfe', 'd')
      .select('e.latitude', 'lat')
      .addSelect('e.longitude', 'lng')
      .addSelect('d.valor_total', 'valor')
      .addSelect('d.dest_nome', 'dest_nome')
      .addSelect('e.chave_nfe', 'chave_nfe')
      .where('e.latitude IS NOT NULL AND e.longitude IS NOT NULL')
      .getRawMany();
    return rows.map((r) => ({
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lng),
      valor: parseFloat(r.valor ?? '0') || 0,
      dest_nome: r.dest_nome ?? '',
      chave_nfe: r.chave_nfe,
    }));
  }
}
