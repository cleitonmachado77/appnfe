'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getToken, getMinhaContaInfo } from '@/lib/api';
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

export default function MinhaContaPage() {
  const router = useRouter();
  const [conta, setConta] = useState<ContaInfo | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace('/login'); return; }
    getMinhaContaInfo(token)
      .then((data) => setConta(data as ContaInfo))
      .finally(() => setCarregando(false));
  }, [router]);

  if (carregando) return <p style={{ color: colors.textSecondary, fontFamily: fonts.body }}>Carregando…</p>;
  if (!conta) return null;

  const dataCriacao = new Date(conta.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: 640 }}>
      <h1 style={s.titulo}>Minha Conta</h1>

      {/* Avatar + nome */}
      <div style={s.card}>
        <div style={s.avatar}>{conta.nome.charAt(0).toUpperCase()}</div>
        <div>
          <p style={s.nomeGrande}>{conta.nome}</p>
          <p style={s.emailTexto}>{conta.email}</p>
          <span style={s.badge}>{conta.tipo}</span>
        </div>
      </div>

      {/* Informações da conta */}
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

      {/* Empresa vinculada */}
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

      {/* Acesso rápido */}
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
};
