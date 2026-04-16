'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';
import { colors, fonts, radius, shadow } from '@/lib/brand';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const data = await login(email, senha);
      setToken(data.token, data.perfil, data.nome);
      if (data.perfil === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (data.perfil === 'ADMIN' || data.perfil === 'USUARIO') {
        router.push('/admin');
      } else {
        router.push('/entregador');
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={s.container}>
      <div style={s.card}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <Image src="/logo1.png" alt="ADD+" width={220} height={110} style={{ objectFit: 'contain' }} priority />
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              style={s.input}
              disabled={loading}
            />
          </div>

          <div style={s.fieldGroup}>
            <label style={s.label} htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={s.input}
              disabled={loading}
            />
          </div>

          {erro && (
            <div style={s.erroBox} role="alert">
              <span style={{ fontSize: '14px' }}>⚠ {erro}</span>
            </div>
          )}

          <button
            type="submit"
            style={loading ? s.btnDisabled : s.btn}
            disabled={loading}
          >
            {loading ? (
              <span style={s.btnInner}>
                <span style={s.spinner} />
                Entrando...
              </span>
            ) : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgPrimary,
    padding: '1rem',
    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(76,175,80,0.08) 0%, transparent 60%)',
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: '2.5rem 2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: shadow.modal,
    border: `1px solid ${colors.border}`,
    animation: 'fadeIn 0.3s ease',
  },
  logoWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '0.75rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: '2rem',
    fontFamily: fonts.body,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: colors.textSecondary,
    fontFamily: fonts.body,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: '0.75rem 1rem',
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    backgroundColor: colors.bgSecondary,
    color: colors.textPrimary,
    fontFamily: fonts.body,
    transition: 'border-color 0.2s',
  },
  erroBox: {
    padding: '0.75rem 1rem',
    backgroundColor: colors.errorBg,
    border: `1px solid ${colors.errorBorder}`,
    borderRadius: radius.md,
    color: colors.error,
    fontFamily: fonts.body,
  },
  btn: {
    marginTop: '0.5rem',
    padding: '0.875rem',
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: radius.md,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
    fontFamily: fonts.title,
    letterSpacing: '0.03em',
    boxShadow: shadow.button,
    transition: 'background-color 0.2s',
  },
  btnDisabled: {
    marginTop: '0.5rem',
    padding: '0.875rem',
    backgroundColor: colors.textMuted,
    color: 'rgba(255,255,255,0.5)',
    border: 'none',
    borderRadius: radius.md,
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'not-allowed',
    width: '100%',
    fontFamily: fonts.title,
  },
  btnInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};
