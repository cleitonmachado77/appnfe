'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, listarUsuarios, criarUsuario, excluirEntregador, alterarSenhaEntregador, contarPendenciasEntregador, migrarEntregador, type UsuarioResponse } from '@/lib/api';
import { colors, fonts, radius, shadow } from '@/lib/brand';

type EntregadorItem = UsuarioResponse & { criado_em?: string };

export default function EntregadoresPage() {
  const router = useRouter();
  const [entregadores, setEntregadores] = useState<EntregadorItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [modalSenha, setModalSenha] = useState<EntregadorItem | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState('');
  const [sucessoSenha, setSucessoSenha] = useState(false);
  const [modalMigrar, setModalMigrar] = useState<EntregadorItem | null>(null);
  const [pendencias, setPendencias] = useState<{ entregas_pendentes: number; transferencias_pendentes: number } | null>(null);
  const [destinoId, setDestinoId] = useState('');
  const [migrando, setMigrando] = useState(false);
  const [erroMigrar, setErroMigrar] = useState('');
  const [resultadoMigrar, setResultadoMigrar] = useState<{ entregas_migradas: number; transferencias_migradas: number } | null>(null);

  async function carregar() {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true); setErro('');
    try {
      const lista = await listarUsuarios(token);
      setEntregadores(lista as EntregadorItem[]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar entregadores');
    } finally { setCarregando(false); }
  }

  useEffect(() => { carregar(); }, []);

  async function handleExcluir(id: string, nome: string) {
    if (!confirm(`Excluir o entregador "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const token = getToken();
    if (!token) return;
    setExcluindo(id);
    try {
      await excluirEntregador(id, token);
      setEntregadores((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally { setExcluindo(null); }
  }

  function abrirModal() {
    setNome(''); setEmail(''); setSenha(''); setErroForm(''); setSucesso('');
    setModalAberto(true);
  }

  function abrirModalSenha(u: EntregadorItem) {
    setNovaSenha(''); setErroSenha(''); setSucessoSenha(false);
    setModalSenha(u);
  }

  async function abrirModalMigrar(u: EntregadorItem) {
    setDestinoId(''); setErroMigrar(''); setResultadoMigrar(null); setPendencias(null);
    setModalMigrar(u);
    const token = getToken(); if (!token) return;
    try {
      const p = await contarPendenciasEntregador(u.id, token);
      setPendencias(p);
    } catch { /* silencia */ }
  }

  async function handleMigrar(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); if (!token) return;
    setMigrando(true); setErroMigrar('');
    try {
      const resultado = await migrarEntregador(modalMigrar!.id, destinoId, token);
      setResultadoMigrar(resultado);
    } catch (err) {
      setErroMigrar(err instanceof Error ? err.message : 'Erro ao migrar');
    } finally { setMigrando(false); }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken(); if (!token) return;
    setSalvandoSenha(true); setErroSenha('');
    try {
      await alterarSenhaEntregador(modalSenha!.id, novaSenha, token);
      setSucessoSenha(true);
    } catch (err) {
      setErroSenha(err instanceof Error ? err.message : 'Erro ao alterar senha');
    } finally { setSalvandoSenha(false); }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setSalvando(true); setErroForm('');
    try {
      await criarUsuario({ nome, email, senha }, token);
      setSucesso(`Login criado para ${nome}. Compartilhe as credenciais com o entregador.`);
      setNome(''); setEmail(''); setSenha('');
      carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro ao criar entregador');
    } finally { setSalvando(false); }
  }

  return (
    <div>
      <div style={s.cabecalho}>
        <h1 style={s.titulo}>Entregadores</h1>
        <button onClick={abrirModal} style={s.btnPrimario}>+ Novo entregador</button>
      </div>

      {erro && <p style={s.erro}>{erro}</p>}

      {carregando ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '2rem' }}>
          <span style={s.spinner} />
          <span style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando...</span>
        </div>
      ) : entregadores.length === 0 ? (
        <div style={s.vazio}>
          <span style={{ fontSize: '2.5rem' }}>🚚</span>
          <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Nenhum entregador cadastrado ainda.</p>
          <button onClick={abrirModal} style={s.btnPrimario}>Criar primeiro entregador</button>
        </div>
      ) : (
        <div style={s.tabelaWrapper}>
          <table style={s.tabela}>
            <thead>
              <tr>
                <th style={s.th}>Nome</th>
                <th style={s.th}>Email</th>
                <th style={s.th}>Cadastrado em</th>
                <th style={s.th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entregadores.map((u) => (
                <tr key={u.id}>
                  <td style={s.td}>{u.nome}</td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}>{u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '-'}</td>
                  <td style={s.td}>
                    <button onClick={() => abrirModalSenha(u)} style={s.btnSenha}>Senha</button>
                    <button onClick={() => abrirModalMigrar(u)} style={s.btnMigrar}>Migrar</button>
                    <button
                      onClick={() => handleExcluir(u.id, u.nome)}
                      disabled={excluindo === u.id}
                      style={{ ...s.btnExcluir, opacity: excluindo === u.id ? 0.5 : 1 }}
                    >
                      {excluindo === u.id ? '…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div style={s.overlay} onClick={() => !salvando && setModalAberto(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitulo}>Novo entregador</h2>
            <p style={s.modalDesc}>Crie o login de acesso e compartilhe as credenciais.</p>

            {sucesso ? (
              <div style={s.sucessoBox}>
                <p style={{ margin: '0 0 12px', fontFamily: fonts.body }}>Credenciais criadas com sucesso. {sucesso}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={abrirModal} style={s.btnPrimario}>Criar outro</button>
                  <button onClick={() => setModalAberto(false)} style={s.btnSecundario}>Fechar</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCriar} style={s.form}>
                <div style={s.campo}>
                  <label style={s.label}>Nome completo</label>
                  <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Joao da Silva" style={s.input} disabled={salvando} />
                </div>
                <div style={s.campo}>
                  <label style={s.label}>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="joao@empresa.com" style={s.input} disabled={salvando} />
                </div>
                <div style={s.campo}>
                  <label style={s.label}>Senha (minimo 8 caracteres)</label>
                  <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={8} placeholder="..." style={s.input} disabled={salvando} />
                </div>
                {erroForm && <p style={s.erro}>{erroForm}</p>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" disabled={salvando} style={salvando ? s.btnDisabled : s.btnPrimario}>
                    {salvando ? 'Criando...' : 'Criar login'}
                  </button>
                  <button type="button" onClick={() => setModalAberto(false)} disabled={salvando} style={s.btnSecundario}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {modalSenha && (
        <div style={s.overlay} onClick={() => !salvandoSenha && setModalSenha(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitulo}>Alterar senha</h2>
            <p style={s.modalDesc}>{modalSenha.nome}</p>
            {sucessoSenha ? (
              <div style={s.sucessoBox}>
                <p style={{ margin: '0 0 12px', fontFamily: fonts.body }}>Senha alterada com sucesso.</p>
                <button onClick={() => setModalSenha(null)} style={s.btnPrimario}>Fechar</button>
              </div>
            ) : (
              <form onSubmit={handleAlterarSenha} style={s.form}>
                <div style={s.campo}>
                  <label style={s.label}>Nova senha (mínimo 8 caracteres)</label>
                  <input
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Nova senha..."
                    style={s.input}
                    disabled={salvandoSenha}
                    autoFocus
                  />
                </div>
                {erroSenha && <p style={s.erro}>{erroSenha}</p>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" disabled={salvandoSenha} style={salvandoSenha ? s.btnDisabled : s.btnPrimario}>
                    {salvandoSenha ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button type="button" onClick={() => setModalSenha(null)} disabled={salvandoSenha} style={s.btnSecundario}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {modalMigrar && (
        <div style={s.overlay} onClick={() => !migrando && setModalMigrar(null)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitulo}>Migrar responsabilidades</h2>
            <p style={s.modalDesc}>De: <strong>{modalMigrar.nome}</strong></p>

            {resultadoMigrar ? (
              <div style={s.sucessoBox}>
                <p style={{ margin: '0 0 6px', fontFamily: fonts.body, fontWeight: 600 }}>Migração concluída</p>
                <p style={{ margin: '0 0 4px', fontFamily: fonts.body, fontSize: '0.875rem' }}>
                  {resultadoMigrar.entregas_migradas} entrega{resultadoMigrar.entregas_migradas !== 1 ? 's' : ''} pendente{resultadoMigrar.entregas_migradas !== 1 ? 's' : ''} transferida{resultadoMigrar.entregas_migradas !== 1 ? 's' : ''}
                </p>
                <p style={{ margin: '0 0 12px', fontFamily: fonts.body, fontSize: '0.875rem' }}>
                  {resultadoMigrar.transferencias_migradas} transferência{resultadoMigrar.transferencias_migradas !== 1 ? 's' : ''} pendente{resultadoMigrar.transferencias_migradas !== 1 ? 's' : ''} migrada{resultadoMigrar.transferencias_migradas !== 1 ? 's' : ''}
                </p>
                <button onClick={() => setModalMigrar(null)} style={s.btnPrimario}>Fechar</button>
              </div>
            ) : (
              <form onSubmit={handleMigrar} style={s.form}>
                {pendencias && (
                  <div style={s.infoBox}>
                    <p style={{ margin: 0, fontSize: '0.8rem', fontFamily: fonts.body, color: colors.textSecondary }}>
                      Pendências encontradas:
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '0.875rem', fontFamily: fonts.body, color: colors.textPrimary }}>
                      {pendencias.entregas_pendentes} entrega{pendencias.entregas_pendentes !== 1 ? 's' : ''} pendente{pendencias.entregas_pendentes !== 1 ? 's' : ''} · {pendencias.transferencias_pendentes} transferência{pendencias.transferencias_pendentes !== 1 ? 's' : ''} ativa{pendencias.transferencias_pendentes !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
                <div style={s.campo}>
                  <label style={s.label}>Transferir para</label>
                  <select
                    value={destinoId}
                    onChange={(e) => setDestinoId(e.target.value)}
                    required
                    style={s.input}
                    disabled={migrando}
                  >
                    <option value="">Selecione o entregador destino…</option>
                    {entregadores.filter((u) => u.id !== modalMigrar.id).map((u) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
                {erroMigrar && <p style={s.erro}>{erroMigrar}</p>}
                <p style={{ margin: 0, fontSize: '0.75rem', color: colors.textMuted, fontFamily: fonts.body }}>
                  Entregas pendentes e transferências ativas serão atribuídas ao entregador selecionado.
                </p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" disabled={!destinoId || migrando} style={!destinoId || migrando ? s.btnDisabled : s.btnPrimario}>
                    {migrando ? 'Migrando...' : 'Confirmar migração'}
                  </button>
                  <button type="button" onClick={() => setModalMigrar(null)} disabled={migrando} style={s.btnSecundario}>Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  cabecalho: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  erro: { color: colors.error, fontSize: '0.875rem', margin: '0 0 8px', fontFamily: fonts.body },
  spinner: { display: 'inline-block', width: '18px', height: '18px', border: `2px solid ${colors.border}`, borderTopColor: colors.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  vazio: { backgroundColor: colors.bgCard, border: `1px dashed ${colors.border}`, borderRadius: radius.lg, padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' },
  tabelaWrapper: { overflowX: 'auto', borderRadius: radius.lg, border: `1px solid ${colors.border}` },
  tabela: { width: '100%', borderCollapse: 'collapse', backgroundColor: colors.bgCard },
  th: { padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: `1px solid ${colors.border}`, backgroundColor: colors.bgSecondary, fontFamily: fonts.body },
  td: { padding: '0.875rem 1rem', fontSize: '0.875rem', color: colors.textPrimary, borderBottom: `1px solid ${colors.border}`, fontFamily: fonts.body },
  btnPrimario: { padding: '0.5rem 1.25rem', backgroundColor: colors.accent, color: '#fff', border: 'none', borderRadius: radius.md, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: fonts.title },
  btnSecundario: { padding: '0.5rem 1.25rem', backgroundColor: 'transparent', color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  btnDisabled: { padding: '0.5rem 1.25rem', backgroundColor: colors.textMuted, color: 'rgba(255,255,255,0.4)', border: 'none', borderRadius: radius.md, fontSize: '0.875rem', cursor: 'not-allowed', fontFamily: fonts.body },
  btnSenha: { display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer', border: `1px solid ${colors.accentBorder}`, backgroundColor: colors.accentLight, color: colors.accent },
  btnMigrar: { display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer', border: `1px solid ${colors.warningBorder}`, backgroundColor: colors.warningBg, color: colors.warning, marginLeft: '0.5rem' },
  btnExcluir: { display: 'inline-block', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer', border: `1px solid ${colors.errorBorder}`, backgroundColor: colors.errorBg, color: colors.error, marginLeft: '0.5rem' },
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { backgroundColor: colors.bgCard, borderRadius: radius.xl, padding: '1.75rem', width: '100%', maxWidth: '440px', boxShadow: shadow.modal, border: `1px solid ${colors.border}` },
  modalTitulo: { fontSize: '1.125rem', fontWeight: 700, color: colors.textPrimary, margin: '0 0 0.25rem', fontFamily: fonts.title },
  modalDesc: { fontSize: '0.875rem', color: colors.textSecondary, margin: '0 0 1.25rem', fontFamily: fonts.body },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '0.75rem', fontWeight: 500, color: colors.textSecondary, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { padding: '0.625rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.md, fontSize: '0.875rem', outline: 'none', backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body },
  sucessoBox: { padding: '1rem', backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, borderRadius: radius.md, color: colors.success, fontSize: '0.875rem' },
  infoBox: { padding: '0.75rem 1rem', backgroundColor: colors.bgSecondary, border: `1px solid ${colors.border}`, borderRadius: radius.md },
};
