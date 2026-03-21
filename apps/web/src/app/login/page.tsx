'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { login, setToken } from '@/lib/api';

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

      if (data.perfil === 'ADMIN') {
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
    <main style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>NF-e Comprovação</h1>
        <p style={styles.subtitle}>Faça login para continuar</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label} htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="seu@email.com"
            style={styles.input}
            disabled={loading}
          />

          <label style={styles.label} htmlFor="senha">Senha</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
            style={styles.input}
            disabled={loading}
          />

          {erro && <p style={styles.erro} role="alert">{erro}</p>}

          <button type="submit" style={loading ? styles.buttonDisabled : styles.button} disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '0.75rem',
    padding: '2rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 0.25rem',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    textAlign: 'center',
    margin: '0 0 1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginTop: '0.5rem',
  },
  input: {
    padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  erro: {
    color: '#dc2626',
    fontSize: '0.875rem',
    margin: '0.25rem 0',
  },
  button: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#1a56db',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
  buttonDisabled: {
    marginTop: '1rem',
    padding: '0.75rem',
    backgroundColor: '#93c5fd',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'not-allowed',
    width: '100%',
  },
};
