'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, cadastrarEmpresa } from '@/lib/api';
import { colors, fonts, radius, shadow } from '@/lib/brand';

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
const PLANOS = ['Starter', 'Profissional', 'Enterprise'];
const SEGMENTOS = ['Logística', 'Varejo', 'Indústria', 'Distribuição', 'Saúde', 'Alimentação', 'Tecnologia', 'Outro'];

type FormData = Record<string, string>;

const INITIAL: FormData = {
  razao_social: '', nome_fantasia: '', cnpj: '', inscricao_estadual: '', segmento: '',
  email_contato: '', telefone: '', celular: '', site: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
  responsavel_nome: '', responsavel_email: '', responsavel_telefone: '', responsavel_cpf: '',
  plano: '', observacoes: '',
  admin_nome: '', admin_email: '', admin_senha: '',
};

export default function CadastrarEmpresaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true); setErro(''); setSucesso('');
    try {
      const token = getToken()!;
      const payload = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''));
      await cadastrarEmpresa(payload, token);
      setSucesso('Empresa cadastrada com sucesso!');
      setForm(INITIAL);
      setTimeout(() => router.push('/super-admin/empresas'), 1500);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 860 }}>
      <h1 style={s.titulo}>Cadastrar Nova Empresa</h1>

      {erro && <div style={s.alertErro}>{erro}</div>}
      {sucesso && <div style={s.alertSucesso}>{sucesso}</div>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Dados da Empresa */}
        <Secao titulo="Dados da Empresa">
          <div style={s.grid2}>
            <Campo label="Razão Social *" required>
              <input style={s.input} value={form.razao_social} onChange={(e) => set('razao_social', e.target.value)} required />
            </Campo>
            <Campo label="Nome Fantasia">
              <input style={s.input} value={form.nome_fantasia} onChange={(e) => set('nome_fantasia', e.target.value)} />
            </Campo>
          </div>
          <div style={s.grid3}>
            <Campo label="CNPJ *" required>
              <input style={s.input} value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" required />
            </Campo>
            <Campo label="Inscrição Estadual">
              <input style={s.input} value={form.inscricao_estadual} onChange={(e) => set('inscricao_estadual', e.target.value)} />
            </Campo>
            <Campo label="Segmento">
              <select style={s.input} value={form.segmento} onChange={(e) => set('segmento', e.target.value)}>
                <option value="">Selecione…</option>
                {SEGMENTOS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Campo>
          </div>
        </Secao>

        {/* Contato */}
        <Secao titulo="Contato">
          <div style={s.grid3}>
            <Campo label="E-mail de Contato *" required>
              <input style={s.input} type="email" value={form.email_contato} onChange={(e) => set('email_contato', e.target.value)} required />
            </Campo>
            <Campo label="Telefone">
              <input style={s.input} value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(00) 0000-0000" />
            </Campo>
            <Campo label="Celular">
              <input style={s.input} value={form.celular} onChange={(e) => set('celular', e.target.value)} placeholder="(00) 00000-0000" />
            </Campo>
          </div>
          <div style={s.grid2}>
            <Campo label="Site">
              <input style={s.input} value={form.site} onChange={(e) => set('site', e.target.value)} placeholder="https://…" />
            </Campo>
          </div>
        </Secao>

        {/* Endereço */}
        <Secao titulo="Endereço">
          <div style={s.grid3}>
            <Campo label="CEP">
              <input style={s.input} value={form.cep} onChange={(e) => set('cep', e.target.value)} placeholder="00000-000" />
            </Campo>
            <Campo label="Logradouro">
              <input style={s.input} value={form.logradouro} onChange={(e) => set('logradouro', e.target.value)} />
            </Campo>
            <Campo label="Número">
              <input style={s.input} value={form.numero} onChange={(e) => set('numero', e.target.value)} />
            </Campo>
          </div>
          <div style={s.grid3}>
            <Campo label="Complemento">
              <input style={s.input} value={form.complemento} onChange={(e) => set('complemento', e.target.value)} />
            </Campo>
            <Campo label="Bairro">
              <input style={s.input} value={form.bairro} onChange={(e) => set('bairro', e.target.value)} />
            </Campo>
            <Campo label="Cidade">
              <input style={s.input} value={form.cidade} onChange={(e) => set('cidade', e.target.value)} />
            </Campo>
          </div>
          <div style={{ maxWidth: 120 }}>
            <Campo label="UF">
              <select style={s.input} value={form.uf} onChange={(e) => set('uf', e.target.value)}>
                <option value="">—</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Campo>
          </div>
        </Secao>

        {/* Responsável */}
        <Secao titulo="Responsável Legal">
          <div style={s.grid2}>
            <Campo label="Nome Completo *" required>
              <input style={s.input} value={form.responsavel_nome} onChange={(e) => set('responsavel_nome', e.target.value)} required />
            </Campo>
            <Campo label="E-mail *" required>
              <input style={s.input} type="email" value={form.responsavel_email} onChange={(e) => set('responsavel_email', e.target.value)} required />
            </Campo>
          </div>
          <div style={s.grid2}>
            <Campo label="Telefone">
              <input style={s.input} value={form.responsavel_telefone} onChange={(e) => set('responsavel_telefone', e.target.value)} />
            </Campo>
            <Campo label="CPF">
              <input style={s.input} value={form.responsavel_cpf} onChange={(e) => set('responsavel_cpf', e.target.value)} placeholder="000.000.000-00" />
            </Campo>
          </div>
        </Secao>

        {/* Plano */}
        <Secao titulo="Plano & Observações">
          <div style={s.grid2}>
            <Campo label="Plano Contratado">
              <select style={s.input} value={form.plano} onChange={(e) => set('plano', e.target.value)}>
                <option value="">Selecione…</option>
                {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Observações">
            <textarea style={{ ...s.input, minHeight: 80, resize: 'vertical' }} value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} />
          </Campo>
        </Secao>

        {/* Acesso Admin */}
        <Secao titulo="Acesso do Administrador" destaque>
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: colors.textMuted, fontFamily: fonts.body }}>
            Credenciais que o administrador da empresa usará para acessar a plataforma.
          </p>
          <div style={s.grid3}>
            <Campo label="Nome do Admin *" required>
              <input style={s.input} value={form.admin_nome} onChange={(e) => set('admin_nome', e.target.value)} required />
            </Campo>
            <Campo label="E-mail do Admin *" required>
              <input style={s.input} type="email" value={form.admin_email} onChange={(e) => set('admin_email', e.target.value)} required />
            </Campo>
            <Campo label="Senha Inicial *" required>
              <input style={s.input} type="password" value={form.admin_senha} onChange={(e) => set('admin_senha', e.target.value)} required minLength={6} />
            </Campo>
          </div>
        </Secao>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button type="button" onClick={() => router.push('/super-admin/empresas')} style={s.btnCancelar}>Cancelar</button>
          <button type="submit" disabled={salvando} style={s.btnSalvar}>
            {salvando ? 'Salvando…' : 'Cadastrar Empresa'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Secao({ titulo, children, destaque }: { titulo: string; children: React.ReactNode; destaque?: boolean }) {
  return (
    <div style={{
      backgroundColor: colors.bgCard,
      border: `1px solid ${destaque ? 'rgba(255,167,38,0.3)' : colors.border}`,
      borderRadius: radius.lg,
      padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.875rem',
    }}>
      <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: destaque ? '#FFA726' : colors.textSecondary, fontFamily: fonts.title, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{titulo}</p>
      {children}
    </div>
  );
}

function Campo({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: '0.72rem', color: colors.textMuted, fontFamily: fonts.body, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}{required && <span style={{ color: colors.error }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  titulo: { fontSize: '1.5rem', fontWeight: 700, color: colors.textPrimary, margin: 0, fontFamily: fonts.title },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.875rem' },
  input: { padding: '0.45rem 0.75rem', border: `1px solid ${colors.border}`, borderRadius: radius.sm, backgroundColor: colors.bgSecondary, color: colors.textPrimary, fontFamily: fonts.body, fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box' as const },
  alertErro: { backgroundColor: colors.errorBg, border: `1px solid ${colors.errorBorder}`, color: colors.error, borderRadius: radius.md, padding: '0.75rem 1rem', fontFamily: fonts.body, fontSize: '0.875rem' },
  alertSucesso: { backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, color: colors.success, borderRadius: radius.md, padding: '0.75rem 1rem', fontFamily: fonts.body, fontSize: '0.875rem' },
  btnSalvar: { backgroundColor: '#FFA726', color: '#1C1C1C', border: 'none', borderRadius: radius.md, padding: '0.6rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: fonts.title, boxShadow: shadow.button },
  btnCancelar: { backgroundColor: 'transparent', border: `1px solid ${colors.borderStrong}`, color: colors.textSecondary, borderRadius: radius.md, padding: '0.6rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: fonts.body },
};
