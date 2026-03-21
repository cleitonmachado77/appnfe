'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, listarUsuarios, criarUsuario, type UsuarioResponse } from '@/lib/api';

type EntregadorItem = UsuarioResponse & { criado_em?: string };

export default function EntregadoresPage() {
  const router = useRouter();
  const [entregadores, setEntregadores] = useState<EntregadorItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // Formulário
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [sucesso, setSucesso] = useState('');

  async function carregar() {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    setCarregando(true);
    setErro('');
    try {
      const lista = await listarUsuarios(token);
      setEntregadores(lista as EntregadorItem[]);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar entregadores');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  function abrirModal() {
    setNome(''); setEmail(''); setSenha('');
    setErroForm(''); setSucesso('');
    setModalAberto(true);
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) { router.replace('/login'); return; }

    setSalvando(true);
    setErroForm('');
    try {
      await criarUsuario({ nome, email, senha }, token);
      setSucesso(`Login criado para ${nome}. Compartilhe as credenciais com o entregador.`);
      setNome(''); setEmail(''); setSenha('');
      carregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro ao criar entregador');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div style={s.cabecalho}>
        <h1 style={s.titulo}>Entregadores</h1>
        <button onClick={abrirModal} style={s.btnPrimario}>+ Novo entregador</button>
      </div>

      {erro && <p style={s.erro}>{erro}</p>}

      {carregando ? (
        <p style={s.info}>Carregando…</p>
      ) : entregadores.length === 0 ? (
        <div style={s.vazio}>
          <p>Nenhum entregador cadastrado ainda.</p>
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
              </tr>
            </thead>
            <tbody>
              {entregadores.map((u) => (
                <tr key={u.id}>
                  <td style={s.td}>{u.nome}</td>
                  <td style={s.td}>{u.email}</td>
                  <td style={s.td}>
                    {u.criado_em
                      ? new Date(u.criado_em).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de criação */}
      {modalAberto && (
        <div style={s.overlay} onClick={() => !salvando && setModalAberto(false)}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={s.modalTitulo}>Novo entregador</h2>
            <p style={s.modalDesc}>
              Crie o login de acesso. Compartilhe o email e senha com o entregador.
            </p>

            {sucesso ? (
              <div style={s.sucessoBox}>
                <p style={{ margin: '0 0 12px' }}>✓ {sucesso}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={abrirModal} style={s.btnPrimario}>Criar outro</button>
                  <button onClick={() => setModalAberto(false)} style={s.btnSecundario}>Fechar</button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCriar} style={s.form}>
                <div style={s.campo}>
                  <label style={s.label}>Nome completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="João da Silva"
                    style={s.input}
                    disabled={salvando}
                  />
                </div>

                <div style={s.campo}>
                  <label style={s.label}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="joao@empresa.com"
                    style={s.input}
                    disabled={salvando}
                  />
                </div>

                <div style={s.campo}>
                  <label style={s.label}>Senha (mínimo 8 caracteres)</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    style={s.input}
                    disabled={salvando}
                  />
                </div>

                {erroForm && <p style={s.erro}>{erroForm}</p>}

                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" disabled={salvando} style={salvando ? s.btnDisabled : s.btnPrimario}>
                    {salvando ? 'Criando…' : 'Criar login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    disabled={salvando}
                    style={s.btnSecundario}
                  >
                    Cancelar
                  </button>
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
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  info: { color: '#6b7280', fontSize: '0.875rem' },
  erro: { color: '#dc2626', fontSize: '0.875rem', margin: '0 0 8px' },
  vazio: {
    backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem',
    padding: '2rem', textAlign: 'center', color: '#6b7280', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: '1rem',
  },
  tabelaWrapper: { overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e5e7eb' },
  tabela: { width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' },
  th: {
    padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600,
    color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb',
  },
  td: { padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#111827', borderBottom: '1px solid #f3f4f6' },
  btnPrimario: {
    padding: '0.5rem 1rem', backgroundColor: '#1a56db', color: '#fff',
    border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  },
  btnSecundario: {
    padding: '0.5rem 1rem', backgroundColor: '#fff', color: '#374151',
    border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer',
  },
  btnDisabled: {
    padding: '0.5rem 1rem', backgroundColor: '#93c5fd', color: '#fff',
    border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'not-allowed',
  },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  },
  modal: {
    backgroundColor: '#fff', borderRadius: '0.75rem', padding: '1.5rem',
    width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  modalTitulo: { fontSize: '1.125rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' },
  modalDesc: { fontSize: '0.875rem', color: '#6b7280', margin: '0 0 1.25rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  campo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '0.8rem', fontWeight: 500, color: '#374151' },
  input: { padding: '0.5rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none' },
  sucessoBox: {
    padding: '1rem', backgroundColor: '#dcfce7', border: '1px solid #16a34a',
    borderRadius: '0.5rem', color: '#15803d', fontSize: '0.875rem',
  },
};
