'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getToken, getPerfil, clearToken } from '@/lib/api';
import { colors, fonts, radius } from '@/lib/brand';

const NAV_LINKS = [
  { href: '/super-admin/dashboard', label: 'Visão Geral' },
  { href: '/super-admin/empresas', label: 'Empresas' },
  { href: '/super-admin/cadastrar', label: '+ Nova Empresa' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [autenticado, setAutenticado] = useState(false);
  const [nome, setNome] = useState('');

  useEffect(() => {
    const token = getToken();
    const perfil = getPerfil();
    if (!token || perfil !== 'SUPER_ADMIN') { router.replace('/login'); return; }
    setNome(localStorage.getItem('nome') ?? '');
    setAutenticado(true);
  }, [router]);

  if (!autenticado) return null;

  return (
    <div style={s.wrapper}>
      <nav style={s.navbar}>
        <div style={s.navLeft}>
          <Image src="/logo1.png" alt="ADD+" width={120} height={48} style={{ objectFit: 'contain' }} />
          <div style={s.badge}>SUPER ADMIN</div>
          <div style={s.divider} />
          <div style={s.navLinks}>
            {NAV_LINKS.map((link) => {
              const ativo = pathname?.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href}
                  style={{ ...s.navLink, ...(ativo ? s.navLinkAtivo : {}) }}>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div style={s.navRight}>
          <span style={s.navUser}>{nome}</span>
          <button onClick={() => { clearToken(); router.replace('/login'); }} style={s.logoutBtn}>Sair</button>
        </div>
      </nav>
      <main style={s.content}>{children}</main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', backgroundColor: colors.bgPrimary, display: 'flex', flexDirection: 'column' },
  navbar: { backgroundColor: colors.bgCard, borderBottom: `1px solid ${colors.border}`, padding: '0 1.5rem', height: '3.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 },
  navLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  badge: { backgroundColor: 'rgba(255,167,38,0.15)', color: '#FFA726', border: '1px solid rgba(255,167,38,0.3)', borderRadius: radius.full, padding: '2px 10px', fontSize: '0.65rem', fontWeight: 700, fontFamily: fonts.body, letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  divider: { width: '1px', height: '24px', backgroundColor: colors.border },
  navLinks: { display: 'flex', gap: '0.25rem' },
  navLink: { color: colors.textSecondary, textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, padding: '0.375rem 0.875rem', borderRadius: radius.md, fontFamily: fonts.body },
  navLinkAtivo: { color: '#FFA726', backgroundColor: 'rgba(255,167,38,0.12)' },
  navRight: { display: 'flex', alignItems: 'center', gap: '1rem' },
  navUser: { fontSize: '0.875rem', color: colors.textSecondary, fontFamily: fonts.body },
  logoutBtn: { backgroundColor: 'transparent', border: `1px solid ${colors.borderStrong}`, color: colors.textSecondary, borderRadius: radius.md, padding: '0.375rem 0.875rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
  content: { flex: 1, padding: '1.75rem 1.5rem', maxWidth: '1200px', width: '100%', margin: '0 auto', boxSizing: 'border-box' as const },
};
