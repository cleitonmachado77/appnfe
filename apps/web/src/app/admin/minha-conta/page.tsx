'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  getToken, getMinhaContaInfo, atualizarMinhaEmpresa, atualizarMeuPerfil,
  listarCamposImagem, criarCampoImagem, atualizarCampoImagem, excluirCampoImagem,
  listarAdmins, criarAdmin, inativarAdmin, reativarAdmin, alterarSenhaAdmin,
  type CampoImagemResponse,
  type AdminUsuarioResponse,
} from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

interface ContaInfo {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  empresa_id: string | null;
  criado_em: string;
  empresa?: {
    id: string;
    razao_social: string;
    nome_fantasia: string | null;
    cnpj: string;
    inscricao_estadual: string | null;
    segmento: string | null;
    email_contato: string;
    telefone: string | null;
    celular: string | null;
    site: string | null;
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    uf: string | null;
    responsavel_nome: string;
    responsavel_email: string;
    responsavel_telefone: string | null;
    responsavel_cpf: string | null;
    plano: string | null;
    status: string;
  } | null;
}

const CAMPOS_PADRAO = ['CANHOTO', 'LOCAL'];

export default function MinhaContaPage() {
  const router = useRouter();
  const [conta, setConta] = useState<ContaInfo | null>(null);
  const [carregando, setCarregando] = useState(true);

  // campos de imagem
  const [campos, setCampos] = useState<CampoImagemResponse[]>([]);
  const [erroCampos, setErroCampos] = useState('');
  const [novoLabel, setNovoLabel] = useState('');
  const [novoObrigatorio, setNovoObrigatorio] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editObrigatorio, setEditObrigatorio] = useState(true);
  const [editAtivo, setEditAtivo] = useState(true);

  // empresa editing
  const [editandoEmpresa, setEditandoEmpresa] = useState(false);
  const [empresaForm, setEmpresaForm] = useState<Record<string, string>>({});
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false);
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [sucessoEmpresa, setSucessoEmpresa] = useState('');

  // perfil editing
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilNome, setPerfilNome] = useState('');
  const [perfilEmail, setPerfilEmail] = useState('');
  const [perfilSenhaAtual, setPerfilSenhaAtual] = useState('');
  const [perfilNovaSenha, setPerfilNovaSenha] = useState('');
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [erroPerfil, setErroPerfil] = useState('');
  const [sucessoPerfil, setSucessoPerfil] = useState('');

  // usuários admin
  const [admins, setAdmins] = useState<AdminUsuarioResponse[] | null>(null);
  const [modalAdmin, setModalAdmin] = useState(false);
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [salvandoAdmin, setSalvandoAdmin] = useState(false);
  const [erroAdmin, setErroAdmin] = useState('');
  const [sucessoAdmin, setSucessoAdmin] = useState('');
  const [alternandoAdmin, setAlternandoAdmin] = useState<string | null>(null);
  const [modalSenhaAdmin, setModalSenhaAdmin] = useState<AdminUsuarioResponse | null>(null);
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState('');
  const [salvandoSenhaAdmin, setSalvandoSenhaAdmin] = useState(false);
  const [erroSenhaAdmin, setErroSenhaAdmin] = useState('');
  const [sucessoSenhaAdmin, setSucessoSenhaAdmin] = useState(false);
  const [adminCargo, setAdminCargo] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    getMinhaContaInfo(token)
      .then((data) => setConta(data as ContaInfo))
      .finally(() => setCarregando(false));
    listarCamposImagem(token).then(setCampos).catch(() => {});
    listarAdmins(token).then(setAdmins).catch((err) => { console.error('Erro ao listar admins:', err); setAdmins([]); });
  }, [router]);

  function iniciarEdicaoPerfil() {
    if (!conta) return;
    setPerfilNome(conta.nome);
    setPerfilEmail(conta.email);
    setPerfilSenhaAtual('');
    setPerfilNovaSenha('');
    setEditandoPerfil(true);
    setErroPerfil('');
    setSucessoPerfil('');
  }

  async function handleSalvarPerfil(ev: React.FormEvent) {
    ev.preventDefault();
    const token = getToken(); if (!token) return;
    setSalvandoPerfil(true); setErroPerfil(''); setSucessoPerfil('');
    try {
      const dados: Record<string, string> = {};
      if (perfilNome !== conta!.nome) dados.nome = perfilNome;
      if (perfilEmail !== conta!.email) dados.email = perfilEmail;
      if (perfilNovaSenha) {
        dados.senha_atual = perfilSenhaAtual;
        dados.nova_senha = perfilNovaSenha;
      }
      if (Object.keys(dados).length === 0) {
        setEditandoPerfil(false);
        return;
      }
      await atualizarMeuPerfil(dados, token);
      setSucessoPerfil('Perfil atualizado com sucesso.');
      setEditandoPerfil(false);
      const data = await getMinhaContaInfo(token);
      setConta(data as ContaInfo);
      // Atualiza nome no localStorage e notifica o header
      localStorage.setItem('nome', (data as ContaInfo).nome);
      window.dispatchEvent(new CustomEvent('perfil-atualizado'));
    } catch (err) {
      setErroPerfil(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSalvandoPerfil(false); }
  }

  function iniciarEdicaoEmpresa() {
    if (!conta?.empresa) return;
    const e = conta.empresa;
    setEmpresaForm({
      razao_social: e.razao_social ?? '',
      nome_fantasia: e.nome_fantasia ?? '',
      cnpj: e.cnpj ?? '',
      inscricao_estadual: e.inscricao_estadual ?? '',
      segmento: e.segmento ?? '',
      email_contato: e.email_contato ?? '',
      telefone: e.telefone ?? '',
      celular: e.celular ?? '',
      site: e.site ?? '',
      cep: e.cep ?? '',
      logradouro: e.logradouro ?? '',
      numero: e.numero ?? '',
      complemento: e.complemento ?? '',
      bairro: e.bairro ?? '',
      cidade: e.cidade ?? '',
      uf: e.uf ?? '',
      responsavel_nome: e.responsavel_nome ?? '',
      responsavel_email: e.responsavel_email ?? '',
      responsavel_telefone: e.responsavel_telefone ?? '',
      responsavel_cpf: e.responsavel_cpf ?? '',
    });
    setEditandoEmpresa(true);
    setErroEmpresa('');
    setSucessoEmpresa('');
  }

  async function handleSalvarEmpresa(ev: React.FormEvent) {
    ev.preventDefault();
    const token = getToken(); if (!token) return;
    setSalvandoEmpresa(true); setErroEmpresa(''); setSucessoEmpresa('');
    try {
      await atualizarMinhaEmpresa(empresaForm, token);
      setSucessoEmpresa('Dados atualizados com sucesso.');
      setEditandoEmpresa(false);
      // Recarrega dados da conta
      const data = await getMinhaContaInfo(token);
      setConta(data as ContaInfo);
    } catch (err) {
      setErroEmpresa(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally { setSalvandoEmpresa(false); }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); if (!token) return;
    setErroCampos('');
    const key = novoLabel.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    if (!key) { setErroCampos('Nome inválido'); return; }
    setCriando(true);
    try {
      const novo = await criarCampoImagem({ key, label: novoLabel, obrigatorio: novoObrigatorio, ordem: campos.length }, token);
      setCampos((prev) => [...prev, novo]);
      setNovoLabel(''); setNovoObrigatorio(true);
    } catch (err) {
      setErroCampos(err instanceof Error ? err.message : 'Erro ao criar campo');
    } finally { setCriando(false); }
  }

  function iniciarEdicao(campo: CampoImagemResponse) {
    setEditandoId(campo.id);
    setEditLabel(campo.label);
    setEditObrigatorio(campo.obrigatorio);
    setEditAtivo(campo.ativo);
  }

  async function handleSalvarEdicao(id: string) {
    const token = getToken(); if (!token) return;
    try {
      const atualizado = await atualizarCampoImagem(id, { label: editLabel, obrigatorio: editObrigatorio, ativo: editAtivo }, token);
      setCampos((prev) => prev.map((c) => c.id === id ? atualizado : c));
      setEditandoId(null);
    } catch (err) {
      setErroCampos(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  async function handleExcluir(campo: CampoImagemResponse) {
    if (!confirm(`Excluir o campo "${campo.label}"? As imagens já registradas não serão afetadas.`)) return;
    const token = getToken(); if (!token) return;
    try {
      await excluirCampoImagem(campo.id, token);
      setCampos((prev) => prev.filter((c) => c.id !== campo.id));
    } catch (err) {
      setErroCampos(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  // ---- Handlers Admin Users ----

  async function handleCriarAdmin(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); if (!token) return;
    setSalvandoAdmin(true); setErroAdmin(''); setSucessoAdmin('');
    try {
      await criarAdmin({ nome: adminNome, email: adminEmail, senha: adminSenha, cargo: adminCargo || undefined }, token);
      setSucessoAdmin(`Login criado para ${adminNome}.`);
      setAdminNome(''); setAdminEmail(''); setAdminSenha(''); setAdminCargo('');
      const lista = await listarAdmins(token);
      setAdmins(lista);
      setTimeout(() => { setSucessoAdmin(''); setModalAdmin(false); }, 2000);
    } catch (err) {
      setErroAdmin(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally { setSalvandoAdmin(false); }
  }

  async function handleAlternarAdmin(u: AdminUsuarioResponse) {
    const acao = u.ativo !== false ? 'inativar' : 'reativar';
    if (!confirm(`${acao === 'inativar' ? 'Inativar' : 'Reativar'} o usuário "${u.nome}"?`)) return;
    const token = getToken(); if (!token) return;
    setAlternandoAdmin(u.id);
    try {
      if (acao === 'inativar') {
        await inativarAdmin(u.id, token);
        setAdmins((prev) => (prev ?? []).map((a) => a.id === u.id ? { ...a, ativo: false, inativado_em: new Date().toISOString() } : a));
      } else {
        await reativarAdmin(u.id, token);
        setAdmins((prev) => (prev ?? []).map((a) => a.id === u.id ? { ...a, ativo: true, inativado_em: null } : a));
      }
    } catch (err) {
      setErroAdmin(err instanceof Error ? err.message : `Erro ao ${acao}`);
    } finally { setAlternandoAdmin(null); }
  }

  async function handleSenhaAdmin(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); if (!token) return;
    setSalvandoSenhaAdmin(true); setErroSenhaAdmin('');
    try {
      await alterarSenhaAdmin(modalSenhaAdmin!.id, novaSenhaAdmin, token);
      setSucessoSenhaAdmin(true);
      setTimeout(() => { setModalSenhaAdmin(null); setSucessoSenhaAdmin(false); }, 2000);
    } catch (err) {
      setErroSenhaAdmin(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally { setSalvandoSenhaAdmin(false); }
  }

  if (carregando) return <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</p>;
  if (!conta) return null;

  const isAdmin = conta.tipo === 'ADMIN';
  const dataCriacao = new Date(conta.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={s.titulo}>Minha Conta</h1>
        <a href="/add-entregas.apk" download="ADD+ Entregas.apk" title="Baixar App Android"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textDecoration: 'none', gap: '6px' }}>
          <div style={{ width: '130px', height: '53px', backgroundColor: '#ffffff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Image src="/apkicon.png" alt="Baixar APK" width={130} height={53} style={{ objectFit: 'contain', cursor: 'pointer', borderRadius: '10px' }} />
          </div>
          <span style={{ fontSize: '11px', color: colors.textMuted, fontFamily: fonts.body }}>Baixar App</span>
        </a>
      </div>

      <div style={s.card}>
        <div style={s.avatar}>{conta.nome.charAt(0).toUpperCase()}</div>
        <div>
          <p style={s.nomeGrande}>{conta.nome}</p>
          <p style={s.emailTexto}>{conta.email}</p>
          <span style={s.badge}>{conta.tipo}</span>
        </div>
      </div>

      <div style={s.secao}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <p style={{ ...s.secaoTitulo, margin: 0 }}>Informações da Conta</p>
          {!editandoPerfil && (
            <button onClick={iniciarEdicaoPerfil} style={s.btnAdicionar}>✏️ Editar</button>
          )}
        </div>

        {sucessoPerfil && <p style={{ color: colors.success, fontSize: '0.85rem', fontFamily: fonts.body, margin: '0 0 0.75rem' }}>{sucessoPerfil}</p>}

        {editandoPerfil ? (
          <form onSubmit={handleSalvarPerfil} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={s.label}>Nome</label>
              <input value={perfilNome} onChange={(e) => setPerfilNome(e.target.value)} required minLength={2} style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={s.label}>E-mail</label>
              <input type="email" value={perfilEmail} onChange={(e) => setPerfilEmail(e.target.value)} required style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <p style={{ fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body, margin: '0.25rem 0 0' }}>Alterar senha (opcional)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={s.label}>Senha atual</label>
              <input type="password" value={perfilSenhaAtual} onChange={(e) => setPerfilSenhaAtual(e.target.value)} placeholder="Necessária para alterar a senha" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} autoComplete="current-password" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={s.label}>Nova senha (mín. 8 caracteres)</label>
              <input type="password" value={perfilNovaSenha} onChange={(e) => setPerfilNovaSenha(e.target.value)} minLength={8} placeholder="Deixe em branco para manter a atual" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} autoComplete="new-password" />
            </div>
            {erroPerfil && <p style={{ color: colors.error, fontSize: '0.8rem', margin: 0, fontFamily: fonts.body }}>{erroPerfil}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditandoPerfil(false)} style={s.btnCancelar}>Cancelar</button>
              <button type="submit" disabled={salvandoPerfil} style={{ ...s.btnAdicionar, opacity: salvandoPerfil ? 0.6 : 1 }}>
                {salvandoPerfil ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </form>
        ) : (
          <div style={s.linhas}>
            <Linha label="ID" value={conta.id} mono />
            <Linha label="Nome" value={conta.nome} />
            <Linha label="E-mail" value={conta.email} />
            <Linha label="Perfil" value={conta.tipo} />
            <Linha label="Membro desde" value={dataCriacao} />
          </div>
        )}
      </div>

      {conta.empresa && (
        <div style={s.secao}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <p style={{ ...s.secaoTitulo, margin: 0 }}>Empresa</p>
            {!editandoEmpresa && (
              <button onClick={iniciarEdicaoEmpresa} style={s.btnAdicionar}>✏️ Editar</button>
            )}
          </div>

          {sucessoEmpresa && <p style={{ color: colors.success, fontSize: '0.85rem', fontFamily: fonts.body, margin: '0 0 0.75rem' }}>{sucessoEmpresa}</p>}

          {editandoEmpresa ? (
            <form onSubmit={handleSalvarEmpresa} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body, margin: 0 }}>Dados Gerais</p>
              <div style={s.formGrid}>
                <CampoEmpresa label="Razão Social" name="razao_social" value={empresaForm.razao_social} onChange={(v) => setEmpresaForm((p) => ({ ...p, razao_social: v }))} required />
                <CampoEmpresa label="Nome Fantasia" name="nome_fantasia" value={empresaForm.nome_fantasia} onChange={(v) => setEmpresaForm((p) => ({ ...p, nome_fantasia: v }))} />
                <CampoEmpresa label="CNPJ" name="cnpj" value={empresaForm.cnpj} onChange={(v) => setEmpresaForm((p) => ({ ...p, cnpj: v }))} required mono />
                <CampoEmpresa label="Inscrição Estadual" name="inscricao_estadual" value={empresaForm.inscricao_estadual} onChange={(v) => setEmpresaForm((p) => ({ ...p, inscricao_estadual: v }))} />
                <CampoEmpresa label="Segmento" name="segmento" value={empresaForm.segmento} onChange={(v) => setEmpresaForm((p) => ({ ...p, segmento: v }))} />
                <CampoEmpresa label="E-mail de Contato" name="email_contato" value={empresaForm.email_contato} onChange={(v) => setEmpresaForm((p) => ({ ...p, email_contato: v }))} required type="email" />
                <CampoEmpresa label="Telefone" name="telefone" value={empresaForm.telefone} onChange={(v) => setEmpresaForm((p) => ({ ...p, telefone: v }))} />
                <CampoEmpresa label="Celular" name="celular" value={empresaForm.celular} onChange={(v) => setEmpresaForm((p) => ({ ...p, celular: v }))} />
                <CampoEmpresa label="Site" name="site" value={empresaForm.site} onChange={(v) => setEmpresaForm((p) => ({ ...p, site: v }))} />
              </div>

              <p style={{ fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body, margin: '0.5rem 0 0' }}>Endereço</p>
              <div style={s.formGrid}>
                <CampoEmpresa label="CEP" name="cep" value={empresaForm.cep} onChange={(v) => setEmpresaForm((p) => ({ ...p, cep: v }))} />
                <CampoEmpresa label="Logradouro" name="logradouro" value={empresaForm.logradouro} onChange={(v) => setEmpresaForm((p) => ({ ...p, logradouro: v }))} />
                <CampoEmpresa label="Número" name="numero" value={empresaForm.numero} onChange={(v) => setEmpresaForm((p) => ({ ...p, numero: v }))} />
                <CampoEmpresa label="Complemento" name="complemento" value={empresaForm.complemento} onChange={(v) => setEmpresaForm((p) => ({ ...p, complemento: v }))} />
                <CampoEmpresa label="Bairro" name="bairro" value={empresaForm.bairro} onChange={(v) => setEmpresaForm((p) => ({ ...p, bairro: v }))} />
                <CampoEmpresa label="Cidade" name="cidade" value={empresaForm.cidade} onChange={(v) => setEmpresaForm((p) => ({ ...p, cidade: v }))} />
                <CampoEmpresa label="UF" name="uf" value={empresaForm.uf} onChange={(v) => setEmpresaForm((p) => ({ ...p, uf: v.toUpperCase().slice(0, 2) }))} maxLength={2} />
              </div>

              <p style={{ fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body, margin: '0.5rem 0 0' }}>Responsável</p>
              <div style={s.formGrid}>
                <CampoEmpresa label="Nome" name="responsavel_nome" value={empresaForm.responsavel_nome} onChange={(v) => setEmpresaForm((p) => ({ ...p, responsavel_nome: v }))} required />
                <CampoEmpresa label="E-mail" name="responsavel_email" value={empresaForm.responsavel_email} onChange={(v) => setEmpresaForm((p) => ({ ...p, responsavel_email: v }))} required type="email" />
                <CampoEmpresa label="Telefone" name="responsavel_telefone" value={empresaForm.responsavel_telefone} onChange={(v) => setEmpresaForm((p) => ({ ...p, responsavel_telefone: v }))} />
                <CampoEmpresa label="CPF" name="responsavel_cpf" value={empresaForm.responsavel_cpf} onChange={(v) => setEmpresaForm((p) => ({ ...p, responsavel_cpf: v }))} />
              </div>

              {erroEmpresa && <p style={{ color: colors.error, fontSize: '0.8rem', margin: 0, fontFamily: fonts.body }}>{erroEmpresa}</p>}

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                <button type="button" onClick={() => setEditandoEmpresa(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" disabled={salvandoEmpresa} style={{ ...s.btnAdicionar, opacity: salvandoEmpresa ? 0.6 : 1 }}>
                  {salvandoEmpresa ? 'Salvando…' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          ) : (
            <div style={s.linhas}>
              <Linha label="Razão Social" value={conta.empresa.razao_social} />
              <Linha label="Nome Fantasia" value={conta.empresa.nome_fantasia ?? '—'} />
              <Linha label="CNPJ" value={conta.empresa.cnpj} mono />
              <Linha label="Inscrição Estadual" value={conta.empresa.inscricao_estadual ?? '—'} />
              <Linha label="Segmento" value={conta.empresa.segmento ?? '—'} />
              <Linha label="E-mail de Contato" value={conta.empresa.email_contato ?? '—'} />
              <Linha label="Telefone" value={conta.empresa.telefone ?? '—'} />
              <Linha label="Celular" value={conta.empresa.celular ?? '—'} />
              <Linha label="Site" value={conta.empresa.site ?? '—'} />
              <Linha label="CEP" value={conta.empresa.cep ?? '—'} />
              <Linha label="Endereço" value={[conta.empresa.logradouro, conta.empresa.numero, conta.empresa.complemento].filter(Boolean).join(', ') || '—'} />
              <Linha label="Bairro" value={conta.empresa.bairro ?? '—'} />
              <Linha label="Cidade / UF" value={[conta.empresa.cidade, conta.empresa.uf].filter(Boolean).join(' / ') || '—'} />
              <Linha label="Responsável" value={conta.empresa.responsavel_nome ?? '—'} />
              <Linha label="E-mail Responsável" value={conta.empresa.responsavel_email ?? '—'} />
              <Linha label="Telefone Responsável" value={conta.empresa.responsavel_telefone ?? '—'} />
              <Linha label="CPF Responsável" value={conta.empresa.responsavel_cpf ?? '—'} />
              <Linha label="Plano" value={conta.empresa.plano ?? '—'} />
              <Linha label="Status" value={conta.empresa.status} />
            </div>
          )}
        </div>
      )}

      {/* Campos de imagem personalizados */}
      <div style={s.secao}>
        <p style={s.secaoTitulo}>Campos de Imagem na Entrega</p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body }}>
          Configure quais fotos o entregador deve enviar. Os campos padrão podem ser desativados mas não excluídos.
        </p>

        {erroCampos && <p style={{ color: colors.error, fontSize: '0.8rem', marginBottom: '0.75rem', fontFamily: fonts.body }}>{erroCampos}</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {campos.map((campo) => (
            <div key={campo.id} style={{ ...s.campoRow, opacity: campo.ativo ? 1 : 0.5 }}>
              {editandoId === campo.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    style={{ ...s.input, flex: 1, minWidth: 120 }}
                  />
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={editObrigatorio} onChange={(e) => setEditObrigatorio(e.target.checked)} />
                    Obrigatório
                  </label>
                  <label style={s.checkLabel}>
                    <input type="checkbox" checked={editAtivo} onChange={(e) => setEditAtivo(e.target.checked)} />
                    Ativo
                  </label>
                  <button onClick={() => handleSalvarEdicao(campo.id)} style={s.btnSalvar}>Salvar</button>
                  <button onClick={() => setEditandoId(null)} style={s.btnCancelar}>Cancelar</button>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.875rem', color: colors.textPrimary, fontFamily: fonts.body, fontWeight: 500 }}>{campo.label}</span>
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontFamily: 'monospace', color: colors.textMuted }}>{campo.key}</span>
                    {campo.obrigatorio && <span style={{ ...s.tagObrig }}>obrigatório</span>}
                    {!campo.ativo && <span style={{ ...s.tagInativo }}>inativo</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => iniciarEdicao(campo)} style={s.btnIcone} title="Editar">✏️</button>
                    {!CAMPOS_PADRAO.includes(campo.key) && (
                      <button onClick={() => handleExcluir(campo)} style={{ ...s.btnIcone, color: colors.error }} title="Excluir">🗑️</button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Formulário novo campo */}
        <form onSubmit={handleCriar} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 160 }}>
            <label style={s.label}>Nome do novo campo</label>
            <input
              value={novoLabel}
              onChange={(e) => setNovoLabel(e.target.value)}
              placeholder="Ex: Receituário"
              style={s.input}
              required
            />
          </div>
          <label style={{ ...s.checkLabel, marginBottom: '0.5rem' }}>
            <input type="checkbox" checked={novoObrigatorio} onChange={(e) => setNovoObrigatorio(e.target.checked)} />
            Obrigatório
          </label>
          <button type="submit" disabled={criando} style={{ ...s.btnAdicionar, opacity: criando ? 0.6 : 1 }}>
            {criando ? '…' : '+ Adicionar'}
          </button>
        </form>
      </div>

      <Link href="/admin/minha-conta/logs" style={s.linkLogs}>
        📋 Ver Logs de Auditoria →
      </Link>

      {/* Seção Usuários do Painel */}
      <div style={s.secao}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <p style={{ ...s.secaoTitulo, margin: 0 }}>Usuários do Painel</p>
          {isAdmin && <button onClick={() => { setModalAdmin(true); setErroAdmin(''); setSucessoAdmin(''); setAdminNome(''); setAdminEmail(''); setAdminSenha(''); setAdminCargo(''); }} style={s.btnAdicionar}>+ Novo Usuário</button>}
        </div>
        <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body }}>
          {isAdmin ? 'Gerencie logins de usuários que acessam o painel administrativo.' : 'Usuários que acessam o painel administrativo.'}
        </p>

        {erroAdmin && <p style={{ color: colors.error, fontSize: '0.8rem', marginBottom: '0.75rem', fontFamily: fonts.body }}>{erroAdmin}</p>}

        {admins === null ? (
          <p style={{ fontSize: '0.85rem', color: colors.textMuted, fontFamily: fonts.body }}>Carregando usuários…</p>
        ) : admins.filter((a) => a.id !== conta.id).length === 0 ? (
          <p style={{ fontSize: '0.85rem', color: colors.textMuted, fontFamily: fonts.body }}>Nenhum usuário adicional cadastrado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {admins.filter((a) => a.id !== conta.id).map((admin) => (
              <div key={admin.id} style={{ ...s.campoRow, opacity: admin.ativo !== false ? 1 : 0.5 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.875rem', color: colors.textPrimary, fontFamily: fonts.body, fontWeight: 500 }}>{admin.nome}</span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body }}>{admin.email}</span>
                  {admin.cargo && <span style={s.tagCargo}>{admin.cargo}</span>}
                  {admin.ativo === false && <span style={s.tagInativo}>inativo</span>}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => { setModalSenhaAdmin(admin); setNovaSenhaAdmin(''); setErroSenhaAdmin(''); setSucessoSenhaAdmin(false); }}
                      style={s.btnIcone}
                      title="Alterar senha"
                    >🔑</button>
                    <button
                      onClick={() => handleAlternarAdmin(admin)}
                      disabled={alternandoAdmin === admin.id}
                      style={s.btnIcone}
                      title={admin.ativo !== false ? 'Inativar' : 'Reativar'}
                    >{admin.ativo !== false ? '⛔' : '✅'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Admin */}
      {modalAdmin && isAdmin && (
        <div style={s.overlay} onClick={() => setModalAdmin(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <p style={{ ...s.secaoTitulo, marginBottom: '1rem' }}>Novo Usuário do Painel</p>
            {sucessoAdmin && <p style={{ color: colors.success, fontSize: '0.85rem', fontFamily: fonts.body }}>{sucessoAdmin}</p>}
            <form onSubmit={handleCriarAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={s.label}>Nome</label>
                <input value={adminNome} onChange={(e) => setAdminNome(e.target.value)} required style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={s.label}>E-mail</label>
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={s.label}>Cargo</label>
                <input value={adminCargo} onChange={(e) => setAdminCargo(e.target.value)} placeholder="Ex: Gerente, Financeiro, Operacional" style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={s.label}>Senha (mín. 8 caracteres)</label>
                <input type="password" value={adminSenha} onChange={(e) => setAdminSenha(e.target.value)} required minLength={8} style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
              {erroAdmin && <p style={{ color: colors.error, fontSize: '0.8rem', margin: 0, fontFamily: fonts.body }}>{erroAdmin}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalAdmin(false)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" disabled={salvandoAdmin} style={{ ...s.btnAdicionar, opacity: salvandoAdmin ? 0.6 : 1 }}>
                  {salvandoAdmin ? 'Criando…' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Alterar Senha Admin */}
      {modalSenhaAdmin && isAdmin && (
        <div style={s.overlay} onClick={() => setModalSenhaAdmin(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <p style={{ ...s.secaoTitulo, marginBottom: '1rem' }}>Alterar Senha — {modalSenhaAdmin.nome}</p>
            {sucessoSenhaAdmin && <p style={{ color: colors.success, fontSize: '0.85rem', fontFamily: fonts.body }}>Senha alterada com sucesso.</p>}
            <form onSubmit={handleSenhaAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={s.label}>Nova Senha (mín. 8 caracteres)</label>
                <input type="password" value={novaSenhaAdmin} onChange={(e) => setNovaSenhaAdmin(e.target.value)} required minLength={8} style={{ ...s.input, width: '100%', boxSizing: 'border-box' }} />
              </div>
              {erroSenhaAdmin && <p style={{ color: colors.error, fontSize: '0.8rem', margin: 0, fontFamily: fonts.body }}>{erroSenhaAdmin}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setModalSenhaAdmin(null)} style={s.btnCancelar}>Cancelar</button>
                <button type="submit" disabled={salvandoSenhaAdmin} style={{ ...s.btnAdicionar, opacity: salvandoSenhaAdmin ? 0.6 : 1 }}>
                  {salvandoSenhaAdmin ? 'Salvando…' : 'Alterar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: `1px solid ${colors.border}` }}>
      <span style={{ fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: colors.textPrimary, fontFamily: mono ? 'monospace' : fonts.body, wordBreak: 'break-all' as const, textAlign: 'right' as const, maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

function CampoEmpresa({ label, name, value, onChange, required, type, mono, maxLength }: {
  label: string; name: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; mono?: boolean; maxLength?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      <input
        name={name}
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        style={{ padding: '0.4rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.875rem', backgroundColor: colors.bgPrimary, color: colors.textPrimary, fontFamily: mono ? 'monospace' : fonts.body, outline: 'none' }}
      />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  card: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1.25rem' },
  avatar: { width: 56, height: 56, borderRadius: '50%', backgroundColor: colors.accentLight, border: `2px solid ${colors.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, color: colors.accent, fontFamily: fonts.title, flexShrink: 0 },
  nomeGrande: { margin: 0, fontSize: '1.1rem', fontWeight: 700, color: colors.textPrimary, fontFamily: fonts.title },
  emailTexto: { margin: '0.2rem 0 0.5rem', fontSize: '0.875rem', color: colors.textSecondary, fontFamily: fonts.body },
  badge: { display: 'inline-block', backgroundColor: colors.accentLight, color: colors.accent, border: `1px solid ${colors.accentBorder}`, borderRadius: radius.full, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body, letterSpacing: '0.05em' },
  secao: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.25rem' },
  secaoTitulo: { margin: '0 0 0.5rem', fontSize: '0.75rem', fontWeight: 700, color: colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.07em' },
  linhas: { display: 'flex', flexDirection: 'column' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' },
  linkLogs: { display: 'flex', alignItems: 'center', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', color: colors.accent, fontFamily: fonts.body, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' },
  campoRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', backgroundColor: colors.bgSecondary, borderRadius: radius.md, border: `1px solid ${colors.border}` },
  tagObrig: { marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: colors.accentLight, color: colors.accent, border: `1px solid ${colors.accentBorder}`, borderRadius: '9999px', padding: '1px 7px', fontFamily: fonts.body },
  tagInativo: { marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}`, borderRadius: '9999px', padding: '1px 7px', fontFamily: fonts.body },
  tagCargo: { marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: colors.bgSecondary, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: '9999px', padding: '1px 7px', fontFamily: fonts.body },
  btnIcone: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px' },
  input: { padding: '0.4rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.875rem', backgroundColor: colors.bgPrimary, color: colors.textPrimary, fontFamily: fonts.body, outline: 'none' },
  label: { fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: colors.textSecondary, fontFamily: fonts.body, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnAdicionar: { padding: '0.4rem 1rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.title },
  btnSalvar: { padding: '0.35rem 0.75rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: '0.8rem', cursor: 'pointer', fontFamily: fonts.body },
  btnCancelar: { padding: '0.35rem 0.75rem', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.8rem', cursor: 'pointer', fontFamily: fonts.body },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1.5rem', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
};
