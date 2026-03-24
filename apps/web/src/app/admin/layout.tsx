'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getToken, getPerfil, clearToken } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const NAV_LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
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
    if (!token || perfil !== 'ADMIN') { router.replace('/login'); return; }
    setNome(typeof window !== 'undefined' ? localStorage.getItem('nome') ?? '' : '');
    setAutenticado(true);
  }, [router]);

  function handleLogout() {
    clearToken();
    router.replace('/login');
  }

  if (!autenticado) return null;

  return (
    <div style={s.wrapper}>
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <Image src="/logo1.png" alt="ADD+" width={120} height={48} style={{ objectFit: 'contain' }} />
          <div style={s.divider} />
          <div style={s.navLinks}>
            {NAV_LINKS.map((link) => {
              const ativo = pathname?.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{ ...s.navLink, ...(ativo ? s.navLinkAtivo : {}) }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={s.navRight}>
          <span style={s.navUser}>{nome}</span>
          <button onClick={handleLogout} style={s.logoutBtn}>Sair</button>
        </div>
      </nav>
      <main style={s.content}>{children}</main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: colors.bgPrimary,
    display: 'flex',
    flexDirection: 'column',
  },
  navbar: {
    backgroundColor: colors.bgCard,
    borderBottom: `1px solid ${colors.border}`,
    padding: '0 1.5rem',
    height: '3.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  navLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: colors.border,
  },
  navLinks: {
    display: 'flex',
    gap: '0.25rem',
  },
  navLink: {
    color: colors.textSecondary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    padding: '0.375rem 0.875rem',
    borderRadius: radius.md,
    fontFamily: fonts.body,
    transition: 'all 0.15s',
  },
  navLinkAtivo: {
    color: colors.accent,
    backgroundColor: colors.accentLight,
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navUser: {
    fontSize: '0.875rem',
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  logoutBtn: {
    backgroundColor: 'transparent',
    border: `1px solid ${colors.borderStrong}`,
    color: colors.textSecondary,
    borderRadius: radius.md,
    padding: '0.375rem 0.875rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    fontFamily: fonts.body,
    transition: 'all 0.15s',
  },
  content: {
    flex: 1,
    padding: '1.75rem 1.5rem',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
};
