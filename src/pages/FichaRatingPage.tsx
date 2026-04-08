import { useState, useCallback, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fichaRatingSchema, type FichaRatingData } from '@/lib/fichaRatingSchema';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

export default function FichaRatingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FichaRatingData>({
    resolver: zodResolver(fichaRatingSchema),
    defaultValues: {
      nome: '', cpf: '', rg: '', titulo_eleitor: '', data_expedicao: '', data_nascimento: '',
      estado_civil: '', nome_pai: '', nome_mae: '',
      cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '',
      tel_residencial: '', tel_celular: '', email: '',
      empresa: '', data_admissao: '', salario: undefined, renda_familiar: undefined, faturamento: undefined,
      bancos: [], referencias: [],
      login_serasa: '', senha_serasa: '',
      possui_imovel1: false, possui_imovel2: false, possui_veiculo: false, possui_empresa: false,
    },
  });

  const watchAll = watch();
  const bancos = watch('bancos') || [];
  const referencias = watch('referencias') || [];

  const totalFields = 15;
  const filledFields = [
    watchAll.nome, watchAll.cpf, watchAll.tel_celular, watchAll.cep,
    watchAll.endereco, watchAll.bairro, watchAll.cidade, watchAll.estado,
    watchAll.empresa, watchAll.login_serasa, watchAll.senha_serasa,
    watchAll.nome_pai, watchAll.nome_mae, watchAll.rg, watchAll.data_nascimento,
  ].filter(v => v && String(v).trim()).length;
  const progressPct = Math.round((filledFields / totalFields) * 100);

  const fetchCep = useCallback(async (cep: string) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setValue('endereco', data.logradouro || '');
        setValue('bairro', data.bairro || '');
        setValue('cidade', data.localidade || '');
        setValue('estado', data.uf || '');
      }
    } catch { /* ignore */ }
  }, [setValue]);

  const addBanco = () => setValue('bancos', [...bancos, { banco: '', agencia: '', conta: '' }]);
  const removeBanco = (i: number) => setValue('bancos', bancos.filter((_, idx) => idx !== i));
  const addReferencia = () => setValue('referencias', [...referencias, { nome: '', celular: '', grau: '' }]);
  const removeReferencia = (i: number) => setValue('referencias', referencias.filter((_, idx) => idx !== i));

  const onSubmit = async (data: FichaRatingData) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('fichas_rating' as any).insert({
        slug: 'geral',
        ...data,
      } as any);

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Erro ao enviar ficha:', err);
      alert('Erro ao enviar ficha. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f5f5f5' }}>
        <div className="rounded-xl shadow-sm p-10 max-w-lg text-center space-y-4" style={{ background: '#fff' }}>
          <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: '#0a3d6b' }} />
          <h2 className="text-2xl font-semibold" style={{ color: '#0a3d6b' }}>Ficha Enviada!</h2>
          <p style={{ color: '#555' }}>Sua ficha foi enviada com sucesso. Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div className="max-w-[640px] mx-auto px-4 pt-6 pb-12 space-y-3">
        {/* Cabeçalho — card arredondado com formas geométricas */}
        <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: '#fff' }}>
          <svg viewBox="0 0 640 160" className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <rect width="640" height="160" fill="#ffffff" />
            {/* Forma azul esquerda */}
            <path d="M0,0 L0,160 Q60,160 100,120 Q140,80 110,30 Q80,0 0,0 Z" fill="#0a3d6b" />
            {/* Forma azul superior direita */}
            <path d="M530,0 Q510,0 510,30 L510,80 Q510,110 540,110 L640,110 L640,0 Z" fill="#0a3d6b" />
            {/* Forma cinza inferior direita */}
            <path d="M550,110 Q540,110 540,130 Q540,160 570,160 L640,160 L640,110 Z" fill="#a0a8b0" />
            {/* Logo centralizada */}
            <image href="/logo-outcom.png" x="220" y="25" width="200" height="110" preserveAspectRatio="xMidYMid meet" />
          </svg>
        </div>
        {/* Título */}
        <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', borderTop: '4px solid #0a3d6b' }}>
          <div className="px-6 py-5">
            <h1 className="text-2xl font-semibold" style={{ color: '#0a3d6b' }}>Ficha Rating — PF</h1>
            <p className="text-sm mt-1" style={{ color: '#888' }}>Parceiro: OUTCOM LTDA</p>
          </div>
        </div>

        {/* Progresso */}
        <div className="rounded-xl shadow-sm px-6 py-4" style={{ background: '#fff' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm" style={{ color: '#666' }}>
              Campos marcados com <span style={{ color: '#d93025' }}>*</span> são obrigatórios.
            </p>
            <span className="text-sm font-semibold whitespace-nowrap ml-4" style={{ color: '#0a3d6b' }}>{progressPct}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: '#e8e8e8' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: '#0a3d6b' }} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <FormCard title="Dados Pessoais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <FormField label="Nome completo" required error={errors.nome?.message}>
                  <FormInput {...register('nome')} hasError={!!errors.nome} />
                </FormField>
              </div>
              <FormField label="CPF" required error={errors.cpf?.message}>
                <FormInput {...register('cpf')} hasError={!!errors.cpf} />
              </FormField>
              <FormField label="RG"><FormInput {...register('rg')} /></FormField>
              <FormField label="Título de eleitor"><FormInput {...register('titulo_eleitor')} /></FormField>
              <FormField label="Data de expedição"><FormInput type="date" {...register('data_expedicao')} /></FormField>
              <FormField label="Data de nascimento"><FormInput type="date" {...register('data_nascimento')} /></FormField>
              <FormField label="Estado civil">
                <FormSelect value={watchAll.estado_civil || ''} onChange={v => setValue('estado_civil', v)} options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} />
              </FormField>
              <FormField label="Nome do pai"><FormInput {...register('nome_pai')} /></FormField>
              <FormField label="Nome da mãe"><FormInput {...register('nome_mae')} /></FormField>
            </div>
          </FormCard>

          <FormCard title="Endereço">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="CEP"><FormInput {...register('cep')} onBlur={e => fetchCep(e.target.value)} placeholder="00000-000" /></FormField>
              <div className="sm:col-span-2"><FormField label="Endereço"><FormInput {...register('endereco')} /></FormField></div>
              <FormField label="Número"><FormInput {...register('numero')} /></FormField>
              <FormField label="Bairro"><FormInput {...register('bairro')} /></FormField>
              <FormField label="Cidade"><FormInput {...register('cidade')} /></FormField>
              <FormField label="Estado"><FormInput {...register('estado')} /></FormField>
            </div>
          </FormCard>

          <FormCard title="Contato">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Telefone residencial"><FormInput {...register('tel_residencial')} /></FormField>
              <FormField label="Telefone celular"><FormInput {...register('tel_celular')} /></FormField>
              <div className="sm:col-span-2">
                <FormField label="E-mail" error={errors.email?.message}>
                  <FormInput type="email" {...register('email')} hasError={!!errors.email} />
                </FormField>
              </div>
            </div>
          </FormCard>

          <FormCard title="Dados Profissionais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2"><FormField label="Empresa"><FormInput {...register('empresa')} /></FormField></div>
              <FormField label="Data de admissão"><FormInput type="date" {...register('data_admissao')} /></FormField>
              <FormField label="Salário"><FormInput type="number" step="0.01" placeholder="R$" {...register('salario', { valueAsNumber: true })} /></FormField>
              <FormField label="Renda familiar"><FormInput type="number" step="0.01" placeholder="R$" {...register('renda_familiar', { valueAsNumber: true })} /></FormField>
              <FormField label="Faturamento"><FormInput type="number" step="0.01" placeholder="R$" {...register('faturamento', { valueAsNumber: true })} /></FormField>
            </div>
          </FormCard>

          <FormCard title="Bancos e Instituições Financeiras">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#333' }}>Bancos</span>
                <button type="button" onClick={addBanco} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors" style={{ color: '#0a3d6b', border: '1px solid #d0d0d0', background: '#fff' }}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {bancos.length === 0 && <p className="text-sm" style={{ color: '#aaa' }}>Nenhum item adicionado.</p>}
              {bancos.map((_, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-4 rounded-lg" style={{ background: '#fafafa', border: '1px solid #eee' }}>
                  <FormField label="Banco" compact><FormInput {...register(`bancos.${i}.banco`)} /></FormField>
                  <FormField label="Agência" compact><FormInput {...register(`bancos.${i}.agencia`)} /></FormField>
                  <FormField label="Conta" compact><FormInput {...register(`bancos.${i}.conta`)} /></FormField>
                  <button type="button" onClick={() => removeBanco(i)} className="h-10 w-10 flex items-center justify-center rounded-full transition-colors" style={{ color: '#d93025' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </FormCard>

          <FormCard title="Referências Pessoais">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#333' }}>Referências</span>
                <button type="button" onClick={addReferencia} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors" style={{ color: '#0a3d6b', border: '1px solid #d0d0d0', background: '#fff' }}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {referencias.length === 0 && <p className="text-sm" style={{ color: '#aaa' }}>Nenhum item adicionado.</p>}
              {referencias.map((_, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-4 rounded-lg" style={{ background: '#fafafa', border: '1px solid #eee' }}>
                  <FormField label="Nome" compact><FormInput {...register(`referencias.${i}.nome`)} /></FormField>
                  <FormField label="Celular" compact><FormInput {...register(`referencias.${i}.celular`)} /></FormField>
                  <FormField label="Grau de relacionamento" compact><FormInput {...register(`referencias.${i}.grau`)} /></FormField>
                  <button type="button" onClick={() => removeReferencia(i)} className="h-10 w-10 flex items-center justify-center rounded-full transition-colors" style={{ color: '#d93025' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </FormCard>

          <FormCard title="Acesso Serasa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Login Serasa"><FormInput {...register('login_serasa')} /></FormField>
              <FormField label="Senha Serasa"><FormInput type="password" {...register('senha_serasa')} /></FormField>
            </div>
          </FormCard>

          <FormCard title="Bens e Patrimônio">
            <div className="space-y-6">
              <ToggleSection label="Possui Imóvel 1?" checked={watchAll.possui_imovel1 || false} onChange={v => setValue('possui_imovel1', v)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField label="Tipo do imóvel"><FormInput {...register('imovel1_tipo')} /></FormField>
                  <FormField label="Localização"><FormInput {...register('imovel1_localizacao')} /></FormField>
                  <FormField label="Bairro"><FormInput {...register('imovel1_bairro')} /></FormField>
                  <FormField label="Cidade"><FormInput {...register('imovel1_cidade')} /></FormField>
                  <FormField label="UF"><FormInput {...register('imovel1_uf')} /></FormField>
                  <FormField label="Valor"><FormInput type="number" step="0.01" placeholder="R$" {...register('imovel1_valor', { valueAsNumber: true })} /></FormField>
                </div>
              </ToggleSection>

              <ToggleSection label="Possui Imóvel 2?" checked={watchAll.possui_imovel2 || false} onChange={v => setValue('possui_imovel2', v)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField label="Tipo do imóvel"><FormInput {...register('imovel2_tipo')} /></FormField>
                  <FormField label="Localização"><FormInput {...register('imovel2_localizacao')} /></FormField>
                  <FormField label="Bairro"><FormInput {...register('imovel2_bairro')} /></FormField>
                  <FormField label="Cidade"><FormInput {...register('imovel2_cidade')} /></FormField>
                  <FormField label="UF"><FormInput {...register('imovel2_uf')} /></FormField>
                  <FormField label="Valor"><FormInput type="number" step="0.01" placeholder="R$" {...register('imovel2_valor', { valueAsNumber: true })} /></FormField>
                </div>
              </ToggleSection>

              <ToggleSection label="Possui Veículo?" checked={watchAll.possui_veiculo || false} onChange={v => setValue('possui_veiculo', v)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField label="Valor"><FormInput type="number" step="0.01" placeholder="R$" {...register('veiculo_valor', { valueAsNumber: true })} /></FormField>
                  <FormField label="Ano fabricação"><FormInput {...register('veiculo_ano')} /></FormField>
                  <FormField label="Placa"><FormInput {...register('veiculo_placa')} /></FormField>
                  <FormField label="Estado licenciamento"><FormInput {...register('veiculo_estado')} /></FormField>
                </div>
              </ToggleSection>

              <ToggleSection label="Possui Empresa?" checked={watchAll.possui_empresa || false} onChange={v => setValue('possui_empresa', v)}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <FormField label="Nome da empresa"><FormInput {...register('empresa_nome')} /></FormField>
                  <FormField label="CNPJ"><FormInput {...register('empresa_cnpj')} /></FormField>
                </div>
              </ToggleSection>
            </div>
          </FormCard>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-60"
              style={{ background: '#0a3d6b' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Enviando...' : 'Enviar ficha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTES NATIVOS — cores inline, nunca herda tema escuro
   ================================================================ */

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff' }}>
      <div className="px-6 py-5 space-y-5">
        <h2 className="text-[15px] font-semibold pb-3" style={{ color: '#0a3d6b', borderBottom: '1px solid #eee' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, error, compact, children }: { label: string; required?: boolean; error?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-normal`} style={{ color: '#444' }}>
        {label} {required && <span style={{ color: '#d93025' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs mt-1" style={{ color: '#d93025' }}>{error}</p>}
    </div>
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({ hasError, className, ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-all ${className || ''}`}
    style={{
      color: '#222',
      background: '#fafafa',
      border: `1.5px solid ${hasError ? '#d93025' : '#e0e0e0'}`,
    }}
    onFocus={e => { e.target.style.borderColor = '#0a3d6b'; e.target.style.background = '#fff'; }}
    onBlur={e => {
      e.target.style.borderColor = hasError ? '#d93025' : '#e0e0e0';
      e.target.style.background = '#fafafa';
      props.onBlur?.(e);
    }}
    {...props}
  />
));
FormInput.displayName = 'FormInput';

function FormSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 text-sm rounded-lg outline-none cursor-pointer"
      style={{
        color: value ? '#222' : '#999',
        background: '#fafafa',
        border: '1.5px solid #e0e0e0',
        appearance: 'auto',
      }}
    >
      <option value="" style={{ color: '#999' }}>Selecione...</option>
      {options.map(o => <option key={o} value={o} style={{ color: '#222' }}>{o}</option>)}
    </select>
  );
}

function ToggleSection({ label, checked, onChange, children }: { label: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => onChange(!checked)}
          className="relative w-11 h-6 rounded-full transition-colors cursor-pointer"
          style={{ background: checked ? '#0a3d6b' : '#d0d0d0' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full shadow-md transition-transform"
            style={{ background: '#fff', transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: '#333' }}>{label}</span>
      </label>
      {checked && <div className="pl-14">{children}</div>}
    </div>
  );
}
