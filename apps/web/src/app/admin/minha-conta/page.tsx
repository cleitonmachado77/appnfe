'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getToken, getMinhaContaInfo,
  listarCamposImagem, criarCampoImagem, atualizarCampoImagem, excluirCampoImagem,
  type CampoImagemResponse,
} from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

interface ContaInfo {
  id: string;
  nome: string;
  email: string;
  tipo: string;
  empresa_id: string | null;
  criado_em: string;
  empresa?: { razao_social: string; cnpj: string; plano: string | null; status: string } | null;
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

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    getMinhaContaInfo(token)
      .then((data) => setConta(data as ContaInfo))
      .finally(() => setCarregando(false));
    listarCamposImagem(token).then(setCampos).catch(() => {});
  }, [router]);

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

  if (carregando) return <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</p>;
  if (!conta) return null;

  const dataCriacao = new Date(conta.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 640 }}>
      <h1 style={s.titulo}>Minha Conta</h1>

      <div style={s.card}>
        <div style={s.avatar}>{conta.nome.charAt(0).toUpperCase()}</div>
        <div>
          <p style={s.nomeGrande}>{conta.nome}</p>
          <p style={s.emailTexto}>{conta.email}</p>
          <span style={s.badge}>{conta.tipo}</span>
        </div>
      </div>

      <div style={s.secao}>
        <p style={s.secaoTitulo}>Informações da Conta</p>
        <div style={s.linhas}>
          <Linha label="ID" value={conta.id} mono />
          <Linha label="Nome" value={conta.nome} />
          <Linha label="E-mail" value={conta.email} />
          <Linha label="Perfil" value={conta.tipo} />
          <Linha label="Membro desde" value={dataCriacao} />
        </div>
      </div>

      {conta.empresa && (
        <div style={s.secao}>
          <p style={s.secaoTitulo}>Empresa</p>
          <div style={s.linhas}>
            <Linha label="Razão Social" value={conta.empresa.razao_social} />
            <Linha label="CNPJ" value={conta.empresa.cnpj} mono />
            <Linha label="Plano" value={conta.empresa.plano ?? '—'} />
            <Linha label="Status" value={conta.empresa.status} />
          </div>
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
  linkLogs: { display: 'flex', alignItems: 'center', backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: radius.lg, padding: '1rem 1.25rem', color: colors.accent, fontFamily: fonts.body, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' },
  campoRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem 0.75rem', backgroundColor: colors.bgSecondary, borderRadius: radius.md, border: `1px solid ${colors.border}` },
  tagObrig: { marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: colors.accentLight, color: colors.accent, border: `1px solid ${colors.accentBorder}`, borderRadius: '9999px', padding: '1px 7px', fontFamily: fonts.body },
  tagInativo: { marginLeft: '0.5rem', fontSize: '0.65rem', backgroundColor: colors.errorBg, color: colors.error, border: `1px solid ${colors.errorBorder}`, borderRadius: '9999px', padding: '1px 7px', fontFamily: fonts.body },
  btnIcone: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '2px 4px' },
  input: { padding: '0.4rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.875rem', backgroundColor: colors.bgPrimary, color: colors.textPrimary, fontFamily: fonts.body, outline: 'none' },
  label: { fontSize: '0.7rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' },
  checkLabel: { display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8rem', color: colors.textSecondary, fontFamily: fonts.body, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnAdicionar: { padding: '0.4rem 1rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.title },
  btnSalvar: { padding: '0.35rem 0.75rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.sm, fontSize: '0.8rem', cursor: 'pointer', fontFamily: fonts.body },
  btnCancelar: { padding: '0.35rem 0.75rem', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.sm, fontSize: '0.8rem', cursor: 'pointer', fontFamily: fonts.body },
};
