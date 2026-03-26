import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Empresa, StatusEmpresa } from '../entities/empresa.entity';
import { Usuario, PerfilUsuario } from '../entities/usuario.entity';
import { Entrega } from '../entities/entrega.entity';
import { DadosNfe } from '../entities/dados-nfe.entity';
import { CadastrarEmpresaDto } from './cadastrar-empresa.dto';
import { CamposImagemService } from '../campos-imagem/campos-imagem.service';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectRepository(Empresa) private readonly empresaRepo: Repository<Empresa>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Entrega) private readonly entregaRepo: Repository<Entrega>,
    @InjectRepository(DadosNfe) private readonly nfeRepo: Repository<DadosNfe>,
    private readonly camposImagemService: CamposImagemService,
  ) {}

  async cadastrarEmpresa(dto: CadastrarEmpresaDto) {
    const existe = await this.empresaRepo.findOne({ where: { cnpj: dto.cnpj } });
    if (existe) throw new ConflictException('CNPJ já cadastrado');

    const emailExiste = await this.usuarioRepo.findOne({ where: { email: dto.admin_email } });
    if (emailExiste) throw new ConflictException('Email do admin já está em uso');

    const empresa = this.empresaRepo.create({
      razao_social: dto.razao_social,
      nome_fantasia: dto.nome_fantasia ?? null,
      cnpj: dto.cnpj,
      inscricao_estadual: dto.inscricao_estadual ?? null,
      segmento: dto.segmento ?? null,
      email_contato: dto.email_contato,
      telefone: dto.telefone ?? null,
      celular: dto.celular ?? null,
      site: dto.site ?? null,
      cep: dto.cep ?? null,
      logradouro: dto.logradouro ?? null,
      numero: dto.numero ?? null,
      complemento: dto.complemento ?? null,
      bairro: dto.bairro ?? null,
      cidade: dto.cidade ?? null,
      uf: dto.uf ?? null,
      responsavel_nome: dto.responsavel_nome,
      responsavel_email: dto.responsavel_email,
      responsavel_telefone: dto.responsavel_telefone ?? null,
      responsavel_cpf: dto.responsavel_cpf ?? null,
      plano: dto.plano ?? null,
      observacoes: dto.observacoes ?? null,
      status: StatusEmpresa.ATIVA,
    });
    const empresaSalva = await this.empresaRepo.save(empresa);

    const senha_hash = await bcrypt.hash(dto.admin_senha, 10);
    const admin = this.usuarioRepo.create({
      nome: dto.admin_nome,
      email: dto.admin_email,
      senha_hash,
      tipo: PerfilUsuario.ADMIN,
      empresa_id: empresaSalva.id,
    });
    const adminSalvo = await this.usuarioRepo.save(admin);
    const { senha_hash: _, ...adminSemSenha } = adminSalvo;

    await this.camposImagemService.inicializarPadrao(empresaSalva.id);

    return { empresa: empresaSalva, admin: adminSemSenha };
  }

  async listarEmpresas() {
    const empresas = await this.empresaRepo.find({ order: { criado_em: 'DESC' } });
    const result = await Promise.all(
      empresas.map(async (e) => {
        const totalUsuarios = await this.usuarioRepo.count({ where: { empresa_id: e.id } });
        const totalEntregas = await this.entregaRepo
          .createQueryBuilder('en')
          .innerJoin('en.entregador', 'u')
          .where('u.empresa_id = :id', { id: e.id })
          .getCount();
        return { ...e, totalUsuarios, totalEntregas };
      }),
    );
    return result;
  }

  async buscarEmpresa(id: string) {
    const empresa = await this.empresaRepo.findOne({ where: { id } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    const usuarios = await this.usuarioRepo.find({ where: { empresa_id: id }, order: { criado_em: 'DESC' } });
    return { ...empresa, usuarios: usuarios.map(({ senha_hash: _, ...u }) => u) };
  }

  async atualizarStatus(id: string, status: StatusEmpresa) {
    const empresa = await this.empresaRepo.findOne({ where: { id } });
    if (!empresa) throw new NotFoundException('Empresa não encontrada');
    empresa.status = status;
    return this.empresaRepo.save(empresa);
  }

  async getStatsGlobais() {
    const [totalEmpresas, totalUsuarios, totalEntregas, valorResult] = await Promise.all([
      this.empresaRepo.count(),
      this.usuarioRepo.count({ where: { tipo: PerfilUsuario.ADMIN } }),
      this.entregaRepo.count(),
      this.nfeRepo.createQueryBuilder('d').select('SUM(d.valor_total)', 'total').getRawOne(),
    ]);

    const empresasPorStatus = await this.empresaRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('e.status')
      .getRawMany();

    const entregasPorMes = await this.entregaRepo
      .createQueryBuilder('e')
      .select("TO_CHAR(e.data_hora, 'YYYY-MM')", 'mes')
      .addSelect('COUNT(*)', 'count')
      .groupBy("TO_CHAR(e.data_hora, 'YYYY-MM')")
      .orderBy("TO_CHAR(e.data_hora, 'YYYY-MM')", 'ASC')
      .limit(12)
      .getRawMany();

    return {
      totalEmpresas,
      totalAdmins: totalUsuarios,
      totalEntregas,
      valorMovimentado: parseFloat(valorResult?.total ?? '0') || 0,
      empresasPorStatus: empresasPorStatus.map((r) => ({ status: r.status, count: parseInt(r.count) })),
      entregasPorMes: entregasPorMes.map((r) => ({ mes: r.mes, count: parseInt(r.count) })),
    };
  }
}
