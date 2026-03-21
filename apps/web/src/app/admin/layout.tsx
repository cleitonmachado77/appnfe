'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getToken, getPerfil, clearToken } from '@/lib/api';

const NAV_LINKS = [
  { href: '/admin/entregas', label: 'Entregas' },
  { href: '/admin/entregadores', label: 'Entregadores' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [nome, setNome] = useState('');
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    const token = getToken();
    const perfil = getPerfil();

    if (!token || perfil !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    const nomeSalvo = typeof window !== 'undefined' ? localStorage.getItem('nome') ?? '' : '';
    setNome(nomeSalvo);
    setAutenticado(true);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  if (!autenticado) return null;

  return (
    <div style={styles.wrapper}>
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.navTitle}>Painel Admin</span>
          <div style={styles.navLinks}>
            {NAV_LINKS.map((link) => {
              const ativo = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ ...styles.navLink, ...(ativo ? styles.navLinkAtivo : {}) }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={styles.navRight}>
          <span style={styles.navUser}>{nome}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sair
          </button>
        </div>
      </nav>
      <main style={styles.content}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    backgroundColor: '#1a56db',
    color: '#ffffff',
    padding: '0 1.5rem',
    height: '3.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  navTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    letterSpacing: '0.01em',
  },
  navLinks: {
    display: 'flex',
    gap: '0.25rem',
  },
  navLink: {
    color: 'rgba(255,255,255,0.75)',
    textDecoration: 'none',
    fontSize: '0.875rem',
    padding: '0.25rem 0.75rem',
    borderRadius: '0.375rem',
  },
  navLinkAtivo: {
    color: '#ffffff',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navUser: {
    fontSize: '0.875rem',
    opacity: 0.9,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.6)',
    color: '#ffffff',
    borderRadius: '0.375rem',
    padding: '0.25rem 0.75rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    padding: '1.5rem',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
};
