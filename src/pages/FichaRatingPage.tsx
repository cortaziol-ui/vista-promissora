import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fichaRatingSchema, type FichaRatingData } from '@/lib/fichaRatingSchema';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, CheckCircle2, Loader2, Upload } from 'lucide-react';

export default function FichaRatingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<{ documento?: File; selfie?: File; comprovante?: File }>({});

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

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('fichas-anexos').upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  };

  const addBanco = () => setValue('bancos', [...bancos, { banco: '', agencia: '', conta: '' }]);
  const removeBanco = (i: number) => setValue('bancos', bancos.filter((_, idx) => idx !== i));
  const addReferencia = () => setValue('referencias', [...referencias, { nome: '', celular: '', grau: '' }]);
  const removeReferencia = (i: number) => setValue('referencias', referencias.filter((_, idx) => idx !== i));

  const onSubmit = async (data: FichaRatingData) => {
    setSubmitting(true);
    try {
      let anexo_documento: string | null = null;
      let anexo_selfie: string | null = null;
      let anexo_comprovante: string | null = null;

      if (files.documento) anexo_documento = await uploadFile(files.documento, slug || 'geral');
      if (files.selfie) anexo_selfie = await uploadFile(files.selfie, slug || 'geral');
      if (files.comprovante) anexo_comprovante = await uploadFile(files.comprovante, slug || 'geral');

      const { error } = await supabase.from('fichas_rating' as any).insert({
        slug: slug || 'geral',
        ...data,
        anexo_documento,
        anexo_selfie,
        anexo_comprovante,
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
      <div className="light min-h-screen flex items-center justify-center p-4" style={{ background: '#f0ebf8' }}>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 max-w-lg text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 mx-auto" style={{ color: '#188038' }} />
          <h2 className="text-2xl font-normal" style={{ color: '#202124' }}>Ficha Enviada!</h2>
          <p style={{ color: '#5f6368' }}>Sua ficha foi enviada com sucesso. Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="light min-h-screen" style={{ background: '#f0ebf8', fontFamily: "'Google Sans', Roboto, Arial, sans-serif" }}>
      {/* Header banner — estilo Google Forms */}
      <div className="w-full" style={{ background: 'linear-gradient(135deg, #0a3d6b 0%, #0e5a94 40%, #1a73b8 70%, #8fa8bf 90%, #b0b8c1 100%)' }}>
        <div className="max-w-[640px] mx-auto px-4 py-8 flex items-center justify-center">
          <img src="/logo-outcom.png" alt="out.com" className="h-12 sm:h-16 object-contain brightness-0 invert" />
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-4 py-3 pb-12 space-y-3">
        {/* Title card — com borda roxa no topo (estilo Google Forms) */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ borderTop: '10px solid #0a3d6b' }}>
          <div className="p-6 pb-4">
            <h1 className="text-[32px] font-normal mb-1" style={{ color: '#202124' }}>Ficha Rating — PF</h1>
            <p className="text-sm" style={{ color: '#5f6368' }}>Parceiro: OUTCOM LTDA</p>
          </div>
        </div>

        {/* Progress card */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm" style={{ color: '#5f6368' }}>
              Preencha todos os campos abaixo com atenção. Campos marcados com <span style={{ color: '#d93025' }}>*</span> são obrigatórios.
            </p>
            <span className="text-sm font-medium whitespace-nowrap ml-4" style={{ color: '#202124' }}>{progressPct}%</span>
          </div>
          <div className="w-full h-1 rounded-full" style={{ background: '#e0e0e0' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progressPct}%`, background: '#0a3d6b' }} />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Dados Pessoais */}
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
              <FormField label="RG">
                <FormInput {...register('rg')} />
              </FormField>
              <FormField label="Título de eleitor">
                <FormInput {...register('titulo_eleitor')} />
              </FormField>
              <FormField label="Data de expedição">
                <FormInput type="date" {...register('data_expedicao')} />
              </FormField>
              <FormField label="Data de nascimento">
                <FormInput type="date" {...register('data_nascimento')} />
              </FormField>
              <FormField label="Estado civil">
                <FormSelect
                  value={watchAll.estado_civil || ''}
                  onChange={v => setValue('estado_civil', v)}
                  options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']}
                />
              </FormField>
              <FormField label="Nome do pai">
                <FormInput {...register('nome_pai')} />
              </FormField>
              <FormField label="Nome da mãe">
                <FormInput {...register('nome_mae')} />
              </FormField>
            </div>
          </FormCard>

          {/* Endereço */}
          <FormCard title="Endereço">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="CEP">
                <FormInput {...register('cep')} onBlur={e => fetchCep(e.target.value)} placeholder="00000-000" />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Endereço">
                  <FormInput {...register('endereco')} />
                </FormField>
              </div>
              <FormField label="Número">
                <FormInput {...register('numero')} />
              </FormField>
              <FormField label="Bairro">
                <FormInput {...register('bairro')} />
              </FormField>
              <FormField label="Cidade">
                <FormInput {...register('cidade')} />
              </FormField>
              <FormField label="Estado">
                <FormInput {...register('estado')} />
              </FormField>
            </div>
          </FormCard>

          {/* Contato */}
          <FormCard title="Contato">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Telefone residencial">
                <FormInput {...register('tel_residencial')} />
              </FormField>
              <FormField label="Telefone celular">
                <FormInput {...register('tel_celular')} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="E-mail" error={errors.email?.message}>
                  <FormInput type="email" {...register('email')} hasError={!!errors.email} />
                </FormField>
              </div>
            </div>
          </FormCard>

          {/* Dados Profissionais */}
          <FormCard title="Dados Profissionais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <FormField label="Empresa">
                  <FormInput {...register('empresa')} />
                </FormField>
              </div>
              <FormField label="Data de admissão">
                <FormInput type="date" {...register('data_admissao')} />
              </FormField>
              <FormField label="Salário">
                <FormInput type="number" step="0.01" placeholder="R$" {...register('salario', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Renda familiar">
                <FormInput type="number" step="0.01" placeholder="R$" {...register('renda_familiar', { valueAsNumber: true })} />
              </FormField>
              <FormField label="Faturamento">
                <FormInput type="number" step="0.01" placeholder="R$" {...register('faturamento', { valueAsNumber: true })} />
              </FormField>
            </div>
          </FormCard>

          {/* Bancos */}
          <FormCard title="Bancos e Instituições Financeiras">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#202124' }}>Bancos</span>
                <button type="button" onClick={addBanco} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors" style={{ color: '#0a3d6b', borderColor: '#dadce0' }}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {bancos.length === 0 && <p className="text-sm" style={{ color: '#80868b' }}>Nenhum item adicionado.</p>}
              {bancos.map((_, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-4 rounded-lg" style={{ background: '#f8f9fa', border: '1px solid #e8eaed' }}>
                  <FormField label="Banco" compact>
                    <FormInput {...register(`bancos.${i}.banco`)} />
                  </FormField>
                  <FormField label="Agência" compact>
                    <FormInput {...register(`bancos.${i}.agencia`)} />
                  </FormField>
                  <FormField label="Conta" compact>
                    <FormInput {...register(`bancos.${i}.conta`)} />
                  </FormField>
                  <button type="button" onClick={() => removeBanco(i)} className="h-10 w-10 flex items-center justify-center rounded-full transition-colors hover:bg-red-50" style={{ color: '#d93025' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </FormCard>

          {/* Referências */}
          <FormCard title="Referências Pessoais">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#202124' }}>Referências</span>
                <button type="button" onClick={addReferencia} className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md border transition-colors" style={{ color: '#0a3d6b', borderColor: '#dadce0' }}>
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {referencias.length === 0 && <p className="text-sm" style={{ color: '#80868b' }}>Nenhum item adicionado.</p>}
              {referencias.map((_, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end p-4 rounded-lg" style={{ background: '#f8f9fa', border: '1px solid #e8eaed' }}>
                  <FormField label="Nome" compact>
                    <FormInput {...register(`referencias.${i}.nome`)} />
                  </FormField>
                  <FormField label="Celular" compact>
                    <FormInput {...register(`referencias.${i}.celular`)} />
                  </FormField>
                  <FormField label="Grau de relacionamento" compact>
                    <FormInput {...register(`referencias.${i}.grau`)} />
                  </FormField>
                  <button type="button" onClick={() => removeReferencia(i)} className="h-10 w-10 flex items-center justify-center rounded-full transition-colors hover:bg-red-50" style={{ color: '#d93025' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </FormCard>

          {/* Acesso Serasa */}
          <FormCard title="Acesso Serasa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Login Serasa">
                <FormInput {...register('login_serasa')} />
              </FormField>
              <FormField label="Senha Serasa">
                <FormInput type="password" {...register('senha_serasa')} />
              </FormField>
            </div>
          </FormCard>

          {/* Bens e Patrimônio */}
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

          {/* Anexos */}
          <FormCard title="Anexos">
            <div className="space-y-5">
              <FileUpload label="CNH ou RG" required onChange={f => setFiles(prev => ({ ...prev, documento: f }))} file={files.documento} />
              <FileUpload label="Selfie segurando documento (CNH ou RG)" required onChange={f => setFiles(prev => ({ ...prev, selfie: f }))} file={files.selfie} />
              <FileUpload label="Comprovante de residência" required onChange={f => setFiles(prev => ({ ...prev, comprovante: f }))} file={files.comprovante} />
            </div>
          </FormCard>

          {/* Submit */}
          <div className="flex justify-between items-center pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-md text-white font-medium text-sm transition-opacity disabled:opacity-60"
              style={{ background: '#0a3d6b' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Enviando...' : 'Enviar ficha'}
            </button>
            <span className="text-xs" style={{ color: '#80868b' }}>Nunca envie senhas em formulários não confiáveis.</span>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ================================================================
   COMPONENTES NATIVOS — sem shadcn/ui, tudo com cores inline
   para garantir que NUNCA herda o tema escuro do dashboard
   ================================================================ */

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg shadow-sm overflow-hidden" style={{ background: '#ffffff', border: '1px solid #e0e0e0' }}>
      <div className="p-6 space-y-5">
        <h2 className="text-base font-medium pb-2" style={{ color: '#202124', borderBottom: '1px solid #e8eaed' }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, required, error, compact, children }: { label: string; required?: boolean; error?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-normal`} style={{ color: '#202124' }}>
        {label} {required && <span style={{ color: '#d93025' }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs" style={{ color: '#d93025' }}>{error}</p>}
    </div>
  );
}

import { forwardRef } from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(({ hasError, className, ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-0 py-2 text-sm bg-transparent outline-none transition-colors ${className || ''}`}
    style={{
      color: '#202124',
      borderBottom: `1px solid ${hasError ? '#d93025' : '#dadce0'}`,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      borderRadius: 0,
    }}
    onFocus={e => { e.target.style.borderBottomColor = '#0a3d6b'; e.target.style.borderBottomWidth = '2px'; }}
    onBlur={e => {
      e.target.style.borderBottomColor = hasError ? '#d93025' : '#dadce0';
      e.target.style.borderBottomWidth = '1px';
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
      className="w-full px-0 py-2 text-sm bg-transparent outline-none cursor-pointer"
      style={{
        color: value ? '#202124' : '#80868b',
        borderBottom: '1px solid #dadce0',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none',
        borderRadius: 0, appearance: 'auto',
      }}
    >
      <option value="" style={{ color: '#80868b' }}>Selecione...</option>
      {options.map(o => <option key={o} value={o} style={{ color: '#202124' }}>{o}</option>)}
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
          style={{ background: checked ? '#0a3d6b' : '#dadce0' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform"
            style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </div>
        <span className="text-sm font-medium" style={{ color: '#202124' }}>{label}</span>
      </label>
      {checked && <div className="pl-14">{children}</div>}
    </div>
  );
}

function FileUpload({ label, required, onChange, file }: { label: string; required?: boolean; onChange: (f: File) => void; file?: File }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-normal" style={{ color: '#202124' }}>
        {label} {required && <span style={{ color: '#d93025' }}>*</span>}
      </label>
      <label
        className="flex flex-col items-center justify-center w-full py-6 px-4 rounded-lg cursor-pointer transition-colors"
        style={{ border: '2px dashed #dadce0', background: file ? '#e8f0fe' : '#fafafa' }}
      >
        {file ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" style={{ color: '#188038' }} />
            <span className="text-sm font-medium" style={{ color: '#202124' }}>{file.name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className="w-6 h-6" style={{ color: '#80868b' }} />
            <span className="text-sm" style={{ color: '#5f6368' }}>Clique para enviar</span>
            <span className="text-xs" style={{ color: '#80868b' }}>PDF, JPG, PNG</span>
          </div>
        )}
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onChange(f); }}
        />
      </label>
    </div>
  );
}
