import { useState, useCallback, useEffect, forwardRef, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { fichaRatingSchema, type FichaRatingData } from '@/lib/fichaRatingSchema';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

// Slug → account_id mapping
const SLUG_TO_ACCOUNT: Record<string, string> = {
  outcom1: 'a0000000-0000-0000-0000-000000000001',
  outcom2: 'a0000000-0000-0000-0000-000000000002',
};
const DEFAULT_ACCOUNT_ID = 'a0000000-0000-0000-0000-000000000001';

const DRAFT_KEY = 'ficha_rating_draft_v1';
const SUBMIT_QUEUE_KEY = 'ficha_rating_submit_queue_v1';

type SubmitError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  payloadSize?: number;
};

export default function FichaRatingPage() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const lastPayloadRef = useRef<Record<string, unknown> | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FichaRatingData>({
    resolver: zodResolver(fichaRatingSchema),
    defaultValues: {
      nome: '', cpf: '', rg: '', titulo_eleitor: '', data_expedicao: '', data_nascimento: '',
      estado_civil: '',
      conjuge_nome: '', conjuge_cpf: '', conjuge_rg: '',
      nome_pai: '', nome_mae: '',
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

  // Auto-save de draft a cada mudança (sem senha)
  useEffect(() => {
    try {
      const { senha_serasa: _omit, ...safeDraft } = watchAll as Record<string, unknown>;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(safeDraft));
    } catch { /* localStorage cheio ou bloqueado — ignora */ }
  }, [watchAll]);

  // Restaura draft no mount (uma vez)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      Object.entries(draft).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          setValue(k as keyof FichaRatingData, v as never, { shouldDirty: false });
        }
      });
    } catch { /* draft corrompido — ignora */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildPayload = (data: FichaRatingData, accountId: string) => {
    // Coerção defensiva: garante que valores numericos sao Number finito, strings sao trimadas
    const numOrNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    const strOrNull = (v: unknown) => {
      if (typeof v !== 'string') return v ?? null;
      const t = v.trim();
      return t.length > 0 ? t : null;
    };

    return {
      slug: 'geral',
      account_id: accountId,
      nome: strOrNull(data.nome),
      cpf: strOrNull(data.cpf),
      rg: strOrNull(data.rg),
      titulo_eleitor: strOrNull(data.titulo_eleitor),
      data_expedicao: strOrNull(data.data_expedicao),
      data_nascimento: strOrNull(data.data_nascimento),
      estado_civil: strOrNull(data.estado_civil),
      conjuge_nome: strOrNull(data.conjuge_nome),
      conjuge_cpf: strOrNull(data.conjuge_cpf),
      conjuge_rg: strOrNull(data.conjuge_rg),
      nome_pai: strOrNull(data.nome_pai),
      nome_mae: strOrNull(data.nome_mae),
      cep: strOrNull(data.cep),
      endereco: strOrNull(data.endereco),
      numero: strOrNull(data.numero),
      bairro: strOrNull(data.bairro),
      cidade: strOrNull(data.cidade),
      estado: strOrNull(data.estado),
      tel_residencial: strOrNull(data.tel_residencial),
      tel_celular: strOrNull(data.tel_celular),
      email: strOrNull(data.email),
      empresa: strOrNull(data.empresa),
      data_admissao: strOrNull(data.data_admissao),
      salario: numOrNull(data.salario),
      renda_familiar: numOrNull(data.renda_familiar),
      faturamento: numOrNull(data.faturamento),
      bancos: Array.isArray(data.bancos) ? data.bancos : [],
      referencias: Array.isArray(data.referencias) ? data.referencias : [],
      login_serasa: strOrNull(data.login_serasa),
      senha_serasa: strOrNull(data.senha_serasa),
      possui_imovel1: !!data.possui_imovel1,
      imovel1_tipo: strOrNull(data.imovel1_tipo),
      imovel1_localizacao: strOrNull(data.imovel1_localizacao),
      imovel1_bairro: strOrNull(data.imovel1_bairro),
      imovel1_cidade: strOrNull(data.imovel1_cidade),
      imovel1_uf: strOrNull(data.imovel1_uf),
      imovel1_valor: numOrNull(data.imovel1_valor),
      possui_imovel2: !!data.possui_imovel2,
      imovel2_tipo: strOrNull(data.imovel2_tipo),
      imovel2_localizacao: strOrNull(data.imovel2_localizacao),
      imovel2_bairro: strOrNull(data.imovel2_bairro),
      imovel2_cidade: strOrNull(data.imovel2_cidade),
      imovel2_uf: strOrNull(data.imovel2_uf),
      imovel2_valor: numOrNull(data.imovel2_valor),
      possui_veiculo: !!data.possui_veiculo,
      veiculo_valor: numOrNull(data.veiculo_valor),
      veiculo_ano: strOrNull(data.veiculo_ano),
      veiculo_placa: strOrNull(data.veiculo_placa),
      veiculo_estado: strOrNull(data.veiculo_estado),
      possui_empresa: !!data.possui_empresa,
      empresa_nome: strOrNull(data.empresa_nome),
      empresa_cnpj: strOrNull(data.empresa_cnpj),
    } as Record<string, unknown>;
  };

  const logFailure = async (accountId: string, err: SubmitError, payloadSnapshot: Record<string, unknown>) => {
    // Best-effort: registra em form_errors pra Caio investigar. Nunca quebra a UI se falhar.
    try {
      await supabase.from('form_errors' as any).insert({
        account_id: accountId,
        form_name: 'ficha_rating',
        error_code: err.code ?? null,
        error_message: err.message,
        error_details: err.details ?? null,
        error_hint: err.hint ?? null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        url: typeof window !== 'undefined' ? window.location.href : null,
        // Payload sem campos sensiveis (senha)
        payload_preview: {
          nome: payloadSnapshot.nome,
          cpf: payloadSnapshot.cpf,
          email: payloadSnapshot.email,
          slug: payloadSnapshot.slug,
        },
      } as any);
    } catch { /* logger nao pode quebrar o fluxo */ }
  };

  const submitPayload = async (payload: Record<string, unknown>, accountId: string) => {
    const { error } = await supabase.from('fichas_rating' as any).insert(payload as any);
    if (error) {
      const submitErr: SubmitError = {
        message: error.message || 'Erro desconhecido',
        code: (error as { code?: string }).code,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
        payloadSize: JSON.stringify(payload).length,
      };
      console.error('[ficha-rating] supabase error', submitErr, payload);
      void logFailure(accountId, submitErr, payload);
      throw submitErr;
    }
  };

  const onSubmit = async (data: FichaRatingData) => {
    setSubmitting(true);
    setSubmitError(null);
    const accountId = (slug && SLUG_TO_ACCOUNT[slug]) || searchParams.get('account') || DEFAULT_ACCOUNT_ID;
    const payload = buildPayload(data, accountId);
    lastPayloadRef.current = payload;
    try {
      await submitPayload(payload, accountId);
      // Sucesso: limpa draft local
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err as SubmitError);
      // Mantém o draft pra cliente nao perder dados — fila offline
      try {
        const queueRaw = localStorage.getItem(SUBMIT_QUEUE_KEY);
        const queue = queueRaw ? (JSON.parse(queueRaw) as unknown[]) : [];
        queue.push({ payload, attemptedAt: new Date().toISOString() });
        localStorage.setItem(SUBMIT_QUEUE_KEY, JSON.stringify(queue));
      } catch { /* noop */ }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!lastPayloadRef.current) return;
    setSubmitting(true);
    setSubmitError(null);
    const accountId = (slug && SLUG_TO_ACCOUNT[slug]) || searchParams.get('account') || DEFAULT_ACCOUNT_ID;
    try {
      await submitPayload(lastPayloadRef.current, accountId);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ }
      try { localStorage.removeItem(SUBMIT_QUEUE_KEY); } catch { /* noop */ }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err as SubmitError);
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
        {/* Cabeçalho — card com formas geométricas à direita */}
        <div className="rounded-xl overflow-hidden shadow-sm relative" style={{ background: '#fff', height: '160px' }}>
          {/* Forma azul superior direita */}
          <div className="absolute top-0 right-0 w-[100px] sm:w-[120px]" style={{ background: '#0a3d6b', height: '110px', borderRadius: '0 0 0 20px' }} />
          {/* Forma cinza inferior direita */}
          <div className="absolute bottom-0 right-0 w-[80px] sm:w-[100px]" style={{ background: '#b0b8c1', height: '60px', borderRadius: '20px 0 0 0' }} />
          {/* Logo centralizada */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo-outcom.png" alt="out.com" className="h-24 sm:h-28 object-contain" style={{ mixBlendMode: 'multiply', filter: 'contrast(1.5) brightness(1.3)' }} />
          </div>
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
              <FormField label="RG" required error={errors.rg?.message}><FormInput {...register('rg')} hasError={!!errors.rg} /></FormField>
              <FormField label="Título de eleitor" required error={errors.titulo_eleitor?.message}><FormInput {...register('titulo_eleitor')} hasError={!!errors.titulo_eleitor} /></FormField>
              <FormField label="Data de expedição" required error={errors.data_expedicao?.message}><FormInput type="date" {...register('data_expedicao')} hasError={!!errors.data_expedicao} /></FormField>
              <FormField label="Data de nascimento" required error={errors.data_nascimento?.message}><FormInput type="date" {...register('data_nascimento')} hasError={!!errors.data_nascimento} /></FormField>
              <FormField label="Estado civil" required error={errors.estado_civil?.message}>
                <FormSelect value={watchAll.estado_civil || ''} onChange={v => {
                  setValue('estado_civil', v);
                  // Limpa campos do cônjuge quando o usuário troca pra qualquer estado civil != Casado(a)
                  if (v !== 'Casado(a)') {
                    setValue('conjuge_nome', '');
                    setValue('conjuge_cpf', '');
                    setValue('conjuge_rg', '');
                  }
                }} options={['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'União Estável']} />
              </FormField>
              {/* Campos do cônjuge — só aparecem quando estado_civil = Casado(a) */}
              {watchAll.estado_civil === 'Casado(a)' && (
                <>
                  <div className="sm:col-span-2">
                    <FormField label="Nome do cônjuge" required error={errors.conjuge_nome?.message}>
                      <FormInput {...register('conjuge_nome')} hasError={!!errors.conjuge_nome} />
                    </FormField>
                  </div>
                  <FormField label="CPF do cônjuge" required error={errors.conjuge_cpf?.message}>
                    <FormInput {...register('conjuge_cpf')} hasError={!!errors.conjuge_cpf} />
                  </FormField>
                  <FormField label="RG do cônjuge" required error={errors.conjuge_rg?.message}>
                    <FormInput {...register('conjuge_rg')} hasError={!!errors.conjuge_rg} />
                  </FormField>
                </>
              )}
              <FormField label="Nome do pai" required error={errors.nome_pai?.message}><FormInput {...register('nome_pai')} hasError={!!errors.nome_pai} /></FormField>
              <FormField label="Nome da mãe" required error={errors.nome_mae?.message}><FormInput {...register('nome_mae')} hasError={!!errors.nome_mae} /></FormField>
            </div>
          </FormCard>

          <FormCard title="Endereço">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="CEP" required error={errors.cep?.message}><FormInput {...register('cep')} onBlur={e => fetchCep(e.target.value)} placeholder="00000-000" hasError={!!errors.cep} /></FormField>
              <div className="sm:col-span-2"><FormField label="Endereço" required error={errors.endereco?.message}><FormInput {...register('endereco')} hasError={!!errors.endereco} /></FormField></div>
              <FormField label="Número" required error={errors.numero?.message}><FormInput {...register('numero')} hasError={!!errors.numero} /></FormField>
              <FormField label="Bairro" required error={errors.bairro?.message}><FormInput {...register('bairro')} hasError={!!errors.bairro} /></FormField>
              <FormField label="Cidade" required error={errors.cidade?.message}><FormInput {...register('cidade')} hasError={!!errors.cidade} /></FormField>
              <FormField label="Estado" required error={errors.estado?.message}><FormInput {...register('estado')} hasError={!!errors.estado} /></FormField>
            </div>
          </FormCard>

          <FormCard title="Contato">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FormField label="Telefone residencial" required error={errors.tel_residencial?.message}><FormInput {...register('tel_residencial')} hasError={!!errors.tel_residencial} /></FormField>
              <FormField label="Telefone celular" required error={errors.tel_celular?.message}><FormInput {...register('tel_celular')} hasError={!!errors.tel_celular} /></FormField>
              <div className="sm:col-span-2">
                <FormField label="E-mail" required error={errors.email?.message}>
                  <FormInput type="email" {...register('email')} hasError={!!errors.email} />
                </FormField>
              </div>
            </div>
          </FormCard>

          <FormCard title="Dados Profissionais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2"><FormField label="Empresa" required error={errors.empresa?.message}><FormInput {...register('empresa')} hasError={!!errors.empresa} /></FormField></div>
              <FormField label="Data de admissão" required error={errors.data_admissao?.message}><FormInput type="date" {...register('data_admissao')} hasError={!!errors.data_admissao} /></FormField>
              <FormField label="Salário" required error={errors.salario?.message}><FormInput type="number" step="0.01" placeholder="R$" {...register('salario', { valueAsNumber: true })} hasError={!!errors.salario} /></FormField>
              <FormField label="Renda familiar" required error={errors.renda_familiar?.message}><FormInput type="number" step="0.01" placeholder="R$" {...register('renda_familiar', { valueAsNumber: true })} hasError={!!errors.renda_familiar} /></FormField>
              <FormField label="Faturamento" required error={errors.faturamento?.message}><FormInput type="number" step="0.01" placeholder="R$" {...register('faturamento', { valueAsNumber: true })} hasError={!!errors.faturamento} /></FormField>
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
              <FormField label="Login Serasa" required error={errors.login_serasa?.message}><FormInput {...register('login_serasa')} hasError={!!errors.login_serasa} /></FormField>
              <FormField label="Senha Serasa" required error={errors.senha_serasa?.message}><FormInput type="password" {...register('senha_serasa')} hasError={!!errors.senha_serasa} /></FormField>
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

          {/* Banner de erro visivel — mostra mensagem real do Supabase + botao "Tentar novamente" sem perder dados */}
          {submitError && (
            <div
              className="rounded-xl shadow-sm p-5 space-y-3"
              style={{ background: '#fff5f5', border: '1px solid #fecaca' }}
              role="alert"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#b91c1c' }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: '#991b1b' }}>
                    Nao conseguimos enviar sua ficha agora.
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#7f1d1d' }}>
                    Seus dados estao salvos neste navegador. Clique em "Tentar novamente" para reenviar — voce nao precisa preencher de novo.
                  </p>
                  <details className="mt-3 text-xs" style={{ color: '#7f1d1d' }}>
                    <summary className="cursor-pointer font-medium">Detalhes tecnicos (para suporte)</summary>
                    <div className="mt-2 space-y-1 font-mono break-all">
                      <div><strong>Mensagem:</strong> {submitError.message}</div>
                      {submitError.code && <div><strong>Codigo:</strong> {submitError.code}</div>}
                      {submitError.details && <div><strong>Detalhes:</strong> {submitError.details}</div>}
                      {submitError.hint && <div><strong>Hint:</strong> {submitError.hint}</div>}
                    </div>
                  </details>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold text-sm disabled:opacity-60"
                style={{ background: '#b91c1c' }}
              >
                <RefreshCw className={`w-4 h-4 ${submitting ? 'animate-spin' : ''}`} />
                {submitting ? 'Reenviando...' : 'Tentar novamente'}
              </button>
            </div>
          )}

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
