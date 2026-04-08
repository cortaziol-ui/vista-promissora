import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fichaRatingSchema, type FichaRatingData } from '@/lib/fichaRatingSchema';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

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

  // Progress calculation
  const totalFields = 15;
  const filledFields = [
    watchAll.nome, watchAll.cpf, watchAll.tel_celular, watchAll.cep,
    watchAll.endereco, watchAll.bairro, watchAll.cidade, watchAll.estado,
    watchAll.empresa, watchAll.login_serasa, watchAll.senha_serasa,
    watchAll.nome_pai, watchAll.nome_mae, watchAll.rg, watchAll.data_nascimento,
  ].filter(v => v && String(v).trim()).length;
  const progressPct = Math.round((filledFields / totalFields) * 100);

  // CEP lookup
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

  // Upload file
  const uploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('fichas-anexos').upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  };

  // Dynamic arrays
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-gray-900">Ficha Enviada!</h2>
          <p className="text-gray-600">Sua ficha foi enviada com sucesso. Entraremos em contato em breve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Ficha Rating — PF</h1>
          <p className="text-sm text-gray-500">Parceiro: OUTCOM LTDA</p>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">Preencha todos os campos abaixo com atenção. Campos marcados com <span className="text-red-500">*</span> são obrigatórios.</p>
            <span className="text-sm font-medium text-gray-700">{progressPct}% preenchido</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Dados Pessoais */}
          <Section title="Dados Pessoais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label>Nome completo <Req /></Label>
                <Input {...register('nome')} className={fieldClass(errors.nome)} />
                {errors.nome && <ErrMsg>{errors.nome.message}</ErrMsg>}
              </div>
              <div className="space-y-1">
                <Label>CPF <Req /></Label>
                <Input {...register('cpf')} className={fieldClass(errors.cpf)} />
                {errors.cpf && <ErrMsg>{errors.cpf.message}</ErrMsg>}
              </div>
              <div className="space-y-1">
                <Label>RG</Label>
                <Input {...register('rg')} />
              </div>
              <div className="space-y-1">
                <Label>Título de eleitor</Label>
                <Input {...register('titulo_eleitor')} />
              </div>
              <div className="space-y-1">
                <Label>Data de expedição</Label>
                <Input type="date" {...register('data_expedicao')} />
              </div>
              <div className="space-y-1">
                <Label>Data de nascimento</Label>
                <Input type="date" {...register('data_nascimento')} />
              </div>
              <div className="space-y-1">
                <Label>Estado civil</Label>
                <Select onValueChange={v => setValue('estado_civil', v)} value={watchAll.estado_civil || ''}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                    <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                    <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                    <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                    <SelectItem value="União Estável">União Estável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nome do pai</Label>
                <Input {...register('nome_pai')} />
              </div>
              <div className="space-y-1">
                <Label>Nome da mãe</Label>
                <Input {...register('nome_mae')} />
              </div>
            </div>
          </Section>

          {/* Endereço */}
          <Section title="Endereço">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input {...register('cep')} onBlur={e => fetchCep(e.target.value)} placeholder="00000-000" />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Endereço</Label>
                <Input {...register('endereco')} />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input {...register('numero')} />
              </div>
              <div className="space-y-1">
                <Label>Bairro</Label>
                <Input {...register('bairro')} />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input {...register('cidade')} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Input {...register('estado')} />
              </div>
            </div>
          </Section>

          {/* Contato */}
          <Section title="Contato">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Telefone residencial</Label>
                <Input {...register('tel_residencial')} />
              </div>
              <div className="space-y-1">
                <Label>Telefone celular</Label>
                <Input {...register('tel_celular')} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>E-mail</Label>
                <Input type="email" {...register('email')} className={fieldClass(errors.email)} />
                {errors.email && <ErrMsg>{errors.email.message}</ErrMsg>}
              </div>
            </div>
          </Section>

          {/* Dados Profissionais */}
          <Section title="Dados Profissionais">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1">
                <Label>Empresa</Label>
                <Input {...register('empresa')} />
              </div>
              <div className="space-y-1">
                <Label>Data de admissão</Label>
                <Input type="date" {...register('data_admissao')} />
              </div>
              <div className="space-y-1">
                <Label>Salário</Label>
                <Input type="number" step="0.01" placeholder="R$" {...register('salario', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Renda familiar</Label>
                <Input type="number" step="0.01" placeholder="R$" {...register('renda_familiar', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Faturamento</Label>
                <Input type="number" step="0.01" placeholder="R$" {...register('faturamento', { valueAsNumber: true })} />
              </div>
            </div>
          </Section>

          {/* Bancos */}
          <Section title="Bancos e Instituições Financeiras">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Bancos</span>
                <Button type="button" variant="outline" size="sm" onClick={addBanco} className="gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
              {bancos.length === 0 && <p className="text-sm text-gray-400">Nenhum item adicionado.</p>}
              {bancos.map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-xs">Banco</Label>
                    <Input {...register(`bancos.${i}.banco`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Agência</Label>
                    <Input {...register(`bancos.${i}.agencia`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Conta</Label>
                    <Input {...register(`bancos.${i}.conta`)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700" onClick={() => removeBanco(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          {/* Referências Pessoais */}
          <Section title="Referências Pessoais">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Referências</span>
                <Button type="button" variant="outline" size="sm" onClick={addReferencia} className="gap-1">
                  <Plus className="w-3 h-3" /> Adicionar
                </Button>
              </div>
              {referencias.length === 0 && <p className="text-sm text-gray-400">Nenhum item adicionado.</p>}
              {referencias.map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    <Input {...register(`referencias.${i}.nome`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Celular</Label>
                    <Input {...register(`referencias.${i}.celular`)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Grau de relacionamento</Label>
                    <Input {...register(`referencias.${i}.grau`)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700" onClick={() => removeReferencia(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Section>

          {/* Acesso Serasa */}
          <Section title="Acesso Serasa">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Login Serasa</Label>
                <Input {...register('login_serasa')} />
              </div>
              <div className="space-y-1">
                <Label>Senha Serasa</Label>
                <Input type="password" {...register('senha_serasa')} />
              </div>
            </div>
          </Section>

          {/* Bens e Patrimônio */}
          <Section title="Bens e Patrimônio">
            <div className="space-y-6">
              {/* Imóvel 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={watchAll.possui_imovel1} onCheckedChange={v => setValue('possui_imovel1', v)} />
                  <span className="text-sm font-medium text-gray-700">Possui Imóvel 1?</span>
                </div>
                {watchAll.possui_imovel1 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-14">
                    <div className="space-y-1"><Label>Tipo do imóvel</Label><Input {...register('imovel1_tipo')} /></div>
                    <div className="space-y-1"><Label>Localização</Label><Input {...register('imovel1_localizacao')} /></div>
                    <div className="space-y-1"><Label>Bairro</Label><Input {...register('imovel1_bairro')} /></div>
                    <div className="space-y-1"><Label>Cidade</Label><Input {...register('imovel1_cidade')} /></div>
                    <div className="space-y-1"><Label>UF</Label><Input {...register('imovel1_uf')} /></div>
                    <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" placeholder="R$" {...register('imovel1_valor', { valueAsNumber: true })} /></div>
                  </div>
                )}
              </div>

              {/* Imóvel 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={watchAll.possui_imovel2} onCheckedChange={v => setValue('possui_imovel2', v)} />
                  <span className="text-sm font-medium text-gray-700">Possui Imóvel 2?</span>
                </div>
                {watchAll.possui_imovel2 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-14">
                    <div className="space-y-1"><Label>Tipo do imóvel</Label><Input {...register('imovel2_tipo')} /></div>
                    <div className="space-y-1"><Label>Localização</Label><Input {...register('imovel2_localizacao')} /></div>
                    <div className="space-y-1"><Label>Bairro</Label><Input {...register('imovel2_bairro')} /></div>
                    <div className="space-y-1"><Label>Cidade</Label><Input {...register('imovel2_cidade')} /></div>
                    <div className="space-y-1"><Label>UF</Label><Input {...register('imovel2_uf')} /></div>
                    <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" placeholder="R$" {...register('imovel2_valor', { valueAsNumber: true })} /></div>
                  </div>
                )}
              </div>

              {/* Veículo */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={watchAll.possui_veiculo} onCheckedChange={v => setValue('possui_veiculo', v)} />
                  <span className="text-sm font-medium text-gray-700">Possui Veículo?</span>
                </div>
                {watchAll.possui_veiculo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-14">
                    <div className="space-y-1"><Label>Valor</Label><Input type="number" step="0.01" placeholder="R$" {...register('veiculo_valor', { valueAsNumber: true })} /></div>
                    <div className="space-y-1"><Label>Ano fabricação</Label><Input {...register('veiculo_ano')} /></div>
                    <div className="space-y-1"><Label>Placa</Label><Input {...register('veiculo_placa')} /></div>
                    <div className="space-y-1"><Label>Estado licenciamento</Label><Input {...register('veiculo_estado')} /></div>
                  </div>
                )}
              </div>

              {/* Empresa */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch checked={watchAll.possui_empresa} onCheckedChange={v => setValue('possui_empresa', v)} />
                  <span className="text-sm font-medium text-gray-700">Possui Empresa?</span>
                </div>
                {watchAll.possui_empresa && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-14">
                    <div className="space-y-1"><Label>Nome da empresa</Label><Input {...register('empresa_nome')} /></div>
                    <div className="space-y-1"><Label>CNPJ</Label><Input {...register('empresa_cnpj')} /></div>
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* Anexos */}
          <Section title="Anexos">
            <div className="space-y-4">
              <FileUpload label="CNH ou RG" required onChange={f => setFiles(prev => ({ ...prev, documento: f }))} file={files.documento} />
              <FileUpload label="Selfie segurando documento (CNH ou RG)" required onChange={f => setFiles(prev => ({ ...prev, selfie: f }))} file={files.selfie} />
              <FileUpload label="Comprovante de residência" required onChange={f => setFiles(prev => ({ ...prev, comprovante: f }))} file={files.comprovante} />
            </div>
          </Section>

          {/* Submit */}
          <Button type="submit" disabled={submitting} className="w-full h-14 text-lg font-semibold gap-2" size="lg">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {submitting ? 'Enviando...' : 'Enviar ficha'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// --- Helper components ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Req() {
  return <span className="text-red-500">*</span>;
}

function ErrMsg({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-red-500">{children}</p>;
}

function fieldClass(error?: any) {
  return error ? 'border-red-500 focus-visible:ring-red-500' : '';
}

function FileUpload({ label, required, onChange, file }: { label: string; required?: boolean; onChange: (f: File) => void; file?: File }) {
  return (
    <div className="space-y-1">
      <Label>{label} {required && <Req />}</Label>
      <label className="flex items-center justify-center w-full h-12 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors bg-gray-50">
        <span className="text-sm text-gray-500">
          {file ? file.name : 'Clique para enviar (PDF, JPG, PNG)'}
        </span>
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
