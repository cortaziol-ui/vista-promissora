import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';

export interface Parcela {
  valor: number;
  status: 'PAGO' | 'AGUARDANDO' | 'CANCELADO';
  dataPagamento?: string;
}

export interface Cliente {
  id: number;
  data: string;
  nome: string;
  cpf: string;
  nascimento: string;
  email: string;
  telefone: string;
  servico: 'LIMPA NOME' | 'RATING' | 'OUTROS';
  vendedor: string;
  entrada: number;
  parcela1: Parcela;
  parcela2: Parcela;
  situacao: string;
  valorTotal: number;
}

export interface Vendedor {
  id: number;
  nome: string;
  cargo: string;
  meta: number;
  avatar: string;
}

export interface VendedorStats {
  vendedor: Vendedor;
  faturamento: number;
  vendas: number;
  ticketMedio: number;
  pctMeta: number;
  faltam: number;
}

interface SalesDataContextType {
  metaMensalGlobal: number;
  setMetaMensalGlobal: (v: number) => void;
  vendedores: Vendedor[];
  updateVendedor: (id: number, partial: Partial<Vendedor>) => void;
  clientes: Cliente[];
  addCliente: (c: Omit<Cliente, 'id'>) => void;
  updateCliente: (id: number, c: Partial<Cliente>) => void;
  deleteCliente: (id: number) => void;
  // Derived
  faturamento: number;
  totalVendas: number;
  ticketMedio: number;
  pctMeta: number;
  projecao: number;
  vendedorStats: VendedorStats[];
  dailyEvolution: { dia: string; dataFull: string; faturamento: number }[];
  ticketPorDia: { dia: string; ticketMedio: number }[];
}

const defaultVendedores: Vendedor[] = [
  { id: 1, nome: 'Bianca', cargo: 'Vendedora', meta: 150000, avatar: '👩' },
  { id: 2, nome: 'Nayra', cargo: 'Vendedora', meta: 120000, avatar: '👩' },
  { id: 3, nome: 'Lucas', cargo: 'Vendedor', meta: 100000, avatar: '👨' },
  { id: 4, nome: 'Gustavo', cargo: 'Vendedor', meta: 80000, avatar: '👨' },
  { id: 5, nome: 'Cunha', cargo: 'Vendedor Sênior', meta: 100000, avatar: '👨' },
];

const defaultClientes: Cliente[] = [
  { id: 1, data: "02/03/2026", nome: "IAGO DE JESUS VIEIRA SILVA", cpf: "627.844.993-59", nascimento: "20/02/2002", email: "hiagodejesus881@gmail.com", telefone: "(62) 99958-5241", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 2, data: "05/03/2026", nome: "FRANCISCA FERNANDA ASSUNCAO DA SILVA SANTOS", cpf: "036.085.563-62", nascimento: "02/01/1988", email: "nandanandas2014@gmail.com", telefone: "(62) 98618-4623", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 3, data: "05/03/2026", nome: "RONALDO MARTINS DE REZENE", cpf: "041.174.641-32", nascimento: "16/10/1995", email: "ronaldo.rezene188@gmail.com", telefone: "(64) 99328-3887", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 4, data: "06/03/2026", nome: "PAULO VIEIRA DO NASCIMENTO", cpf: "407.622.033-15", nascimento: "22/08/1970", email: "pauloprofetavieira@gmail.com", telefone: "(96) 98424-3263", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 5, data: "06/03/2026", nome: "JEFFERSON EUSTAQUIO DA SILVA BRITO", cpf: "249.920.178-94", nascimento: "07/01/1976", email: "jeffersonbrito129@gmail.com", telefone: "(99) 99115-5036", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 6, data: "09/03/2026", nome: "LUCIANO JOAQUIM DA SILVA", cpf: "482.992.431-49", nascimento: "24/01/1970", email: "lucianojpaquinquim@gmail.com", telefone: "(61) 98155-4067", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 7, data: "09/03/2026", nome: "FRANCISCA MARIA RODRIGUES SILVA", cpf: "732.795.283-72", nascimento: "13/07/1968", email: "franciscamariame@hotmail.com", telefone: "(61) 98171-6032", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 8, data: "09/03/2026", nome: "BRENO DO NASCIMENTO TAVEIRA", cpf: "147.395.957-88", nascimento: "08/03/1996", email: "brenon380@gmail.com", telefone: "(61) 99982-2015", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 9, data: "11/03/2026", nome: "DANIEL DE SOUZA LOPES", cpf: "026.599.972-33", nascimento: "27/02/1994", email: "danieljips199494@gmail.com", telefone: "(69) 99388-6118", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 10, data: "11/03/2026", nome: "JOSE JUSTINO BARBOSA", cpf: "252.331.118-61", nascimento: "02/06/1974", email: "saderbar@gmail.com", telefone: "(11) 95968-6886", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 11, data: "12/03/2026", nome: "CARLOS HENRIQUE VIEIRA DOS SANTOS", cpf: "420.464.508-92", nascimento: "29/08/1993", email: "hvieira62@hotmail.com", telefone: "(11) 91131-9231", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 12, data: "12/03/2026", nome: "JOSE AILTON LIMA SANTANA", cpf: "027.235.345-02", nascimento: "20/06/1987", email: "joseailtonsarah@gmail.com", telefone: "(71) 99225-9010", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 13, data: "13/03/2026", nome: "OZIAS DA SILVA", cpf: "091.407.886-01", nascimento: "20/01/1989", email: "oziaspapagaios@gmail.com", telefone: "(37) 99663-0775", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 14, data: "13/03/2026", nome: "ELIELDES DE SOUZA", cpf: "000.556.451-43", nascimento: "20/05/1984", email: "lavajatocanaa2017@gmail.com", telefone: "(62) 999897053", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 15, data: "13/03/2026", nome: "EVALDO ALVES DOS SANTOS", cpf: "612.118.695-04", nascimento: "17/10/1973", email: "alvesvadu@gmail.com", telefone: "(75) 98151-7823", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 16, data: "16/03/2026", nome: "FABIANO DOS SANTOS DA SILVA", cpf: "042.819.723-07", nascimento: "30/11/1991", email: "fasantoscn1@gmail.com", telefone: "(43) 98443-8720", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 17, data: "16/03/2026", nome: "MARIA GENECY SOUZA", cpf: "418.766.522-68", nascimento: "10/10/1970", email: "smariagenecy@gmail.com", telefone: "(69) 99352-3995", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 18, data: "17/03/2026", nome: "NEVERTON MARCELO GONÇALVES RICARDO", cpf: "092.590.929-73", nascimento: "28/08/1997", email: "nevertongoncalves@icloud.com", telefone: "(44) 999792674", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 19, data: "18/03/2026", nome: "PATRICIA BARAUNA ARAUJO MORAES", cpf: "425.170.478-98", nascimento: "23/06/1993", email: "patricia.ban026@gmail.com", telefone: "(11) 961852307", servico: "LIMPA NOME", vendedor: "Bianca", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  // Nayra
  { id: 20, data: "04/03/2026", nome: "IRAMILTON SILVA PEREIRA", cpf: "648.054.841-87", nascimento: "13/05/1973", email: "iramiltonsilva@gmail.com", telefone: "(61) 98487-3869", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 21, data: "05/03/2026", nome: "JULIO RIBEIRO DE SOUZA", cpf: "823.528.871-00", nascimento: "08/05/1962", email: "julioribeirodecosta@gmail.com", telefone: "(61) 98133-8787", servico: "RATING", vendedor: "Nayra", entrada: 500, parcela1: { valor: 250, status: "PAGO", dataPagamento: "18/03/2026" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "SERVIÇO RATING FINALIZADO", valorTotal: 1000 },
  { id: 22, data: "06/03/2026", nome: "FRANCISCO EDUARDO JUNIOR", cpf: "868.301.391-04", nascimento: "11/05/1978", email: "franciscoeduardo0009@gmail.com", telefone: "(61) 99675-6338", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "CANCELADO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 23, data: "10/03/2026", nome: "MARGELO MAGELA DA SILVA", cpf: "282.027.368-89", nascimento: "08/12/1979", email: "marcelomagelas@gmail.com", telefone: "(11) 91284-2402", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 24, data: "11/03/2026", nome: "ROBERTOS CARLOS DE PAULA", cpf: "131.019.718-02", nascimento: "31/03/1972", email: "robertto.c03@gmail.com", telefone: "(14) 99184-6679", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 25, data: "13/03/2026", nome: "LOURIVALDO FERREIRA DE BRITO", cpf: "040.036.108-65", nascimento: "04/09/1962", email: "lourobrrito62@gmail.com", telefone: "(61) 99280-6580", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 26, data: "13/03/2026", nome: "LUCAS CARVALHO LIMA", cpf: "058.553.475-67", nascimento: "23/04/1994", email: "luckaas316@gmail.com", telefone: "(11) 949272514", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 27, data: "16/03/2026", nome: "EDILSON SOARES DOS SANTOS", cpf: "601.631.933-39", nascimento: "30/08/1982", email: "soaresedilsonsoaresdossantos@gmail.com", telefone: "(61) 98211-1242", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 28, data: "16/03/2026", nome: "STELLA DE LIMA BARBOSA", cpf: "037.048.452-56", nascimento: "28/02/2002", email: "natec1010@hotmail.com", telefone: "(94) 99265-4831", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 29, data: "16/03/2026", nome: "JABSON CASSIANO FRANCO", cpf: "017.893.144-61", nascimento: "05/07/1994", email: "jabson.cassiano2@gmail.com", telefone: "(84) 981332300", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 30, data: "17/03/2026", nome: "ERICK RODRIGUES SANTOS", cpf: "120.800.567-78", nascimento: "16/03/1986", email: "rafickn@gmail.com", telefone: "(27) 981068374", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 31, data: "18/03/2026", nome: "JOELMA DE SOUZA", cpf: "993.789.061-68", nascimento: "04/05/1981", email: "joelma.sersocial@hotmail.com", telefone: "(61) 996826617", servico: "LIMPA NOME", vendedor: "Nayra", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  // Cunha
  { id: 32, data: "09/03/2026", nome: "IDALMIR LOPES DE MACHADO", cpf: "052.515.341-16", nascimento: "26/04/1990", email: "idalmirlopesdemacedo1990@gmail.com", telefone: "(61) 99318-7718", servico: "LIMPA NOME", vendedor: "Cunha", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 33, data: "12/03/2026", nome: "RUTH RODRIGUES RIBEIRO", cpf: "099.054.316-16", nascimento: "19/03/1982", email: "ribeiroruthrodrigues1234@gmail.com", telefone: "(37) 9844-3132", servico: "LIMPA NOME", vendedor: "Cunha", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 34, data: "12/03/2026", nome: "BENECIDIO APARECIDO DOS SANTOS", cpf: "109.418.288-59", nascimento: "10/06/1967", email: "benecidiosantos@gmail.com", telefone: "(17) 99719-2224", servico: "LIMPA NOME", vendedor: "Cunha", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 35, data: "12/03/2026", nome: "JENIFFER CAMARGO CARNEIRO", cpf: "120.872.289-14", nascimento: "17/04/2001", email: "jeniffercamargo0311@gmail.com", telefone: "(41) 9672-8558", servico: "LIMPA NOME", vendedor: "Cunha", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 36, data: "12/03/2026", nome: "SAMUEL RICARDO DOS SANTOS", cpf: "161.589.519-19", nascimento: "16/02/2004", email: "samuelricardosantos47@gmail.com", telefone: "(42) 8834-9686", servico: "LIMPA NOME", vendedor: "Cunha", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  // Gustavo
  { id: 37, data: "16/03/2026", nome: "RAFAEL BARROSO DE ARAUJO", cpf: "070.734.991-50", nascimento: "03/09/1998", email: "rafilks.araujo@gmail.com", telefone: "(61) 99637-7773", servico: "LIMPA NOME", vendedor: "Gustavo", entrada: 180, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 680 },
  // Lucas
  { id: 38, data: "17/03/2026", nome: "CARLOS EDUARDO GONÇALVES NUNES", cpf: "072.487.283-30", nascimento: "23/02/1998", email: "goncalvesb25@gmail.com", telefone: "(89) 981482482", servico: "LIMPA NOME", vendedor: "Lucas", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 39, data: "18/03/2026", nome: "AJ VERDI SERVICOS GRAFICOS", cpf: "37.679.957/0001-16", nascimento: "10/07/2020", email: "graficavi@hotmail.com", telefone: "(42) 991618114", servico: "LIMPA NOME", vendedor: "Lucas", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
  { id: 40, data: "19/03/2026", nome: "IVONE MARIA ROSA", cpf: "037.467.829-45", nascimento: "05/04/1978", email: "rodriguesrosaconfeccoes@hotmail.com", telefone: "(44) 99765-6491", servico: "LIMPA NOME", vendedor: "Lucas", entrada: 179, parcela1: { valor: 250, status: "AGUARDANDO" }, parcela2: { valor: 250, status: "AGUARDANDO" }, situacao: "ENVIADO - AGUARDANDO LIMPAR", valorTotal: 679 },
];

const STORAGE_KEY_CLIENTES = 'salesData_v2_clientes';
const STORAGE_KEY_VENDEDORES = 'salesData_v2_vendedores';

function validateCliente(c: unknown): c is Cliente {
  if (!c || typeof c !== 'object') return false;
  const obj = c as Record<string, unknown>;
  return (
    typeof obj.id === 'number' &&
    typeof obj.data === 'string' && obj.data.length > 0 &&
    typeof obj.nome === 'string' && obj.nome.length > 0 &&
    typeof obj.entrada === 'number' &&
    obj.parcela1 != null && typeof obj.parcela1 === 'object' &&
    obj.parcela2 != null && typeof obj.parcela2 === 'object'
  );
}

function loadFromStorage<T>(key: string, fallback: T, validator?: (item: unknown) => boolean): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(key);
      return fallback;
    }
    // If a validator is provided, check every item — discard all if any fails
    if (validator && !parsed.every(validator)) {
      console.warn(`[SalesData] Corrupted data in "${key}", resetting to defaults.`);
      localStorage.removeItem(key);
      return fallback;
    }
    return parsed as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

// Clean up old storage keys from previous versions
try {
  localStorage.removeItem('salesData_clientes');
  localStorage.removeItem('salesData_vendedores');
} catch { /* ignore */ }

function parseDate(d: string) {
  const [day, month, year] = d.split('/');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

const SalesDataContext = createContext<SalesDataContextType | null>(null);

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [vendedores] = useState<Vendedor[]>(() => loadFromStorage(STORAGE_KEY_VENDEDORES, defaultVendedores));
  const [clientes, setClientes] = useState<Cliente[]>(() => loadFromStorage(STORAGE_KEY_CLIENTES, defaultClientes, validateCliente));
  const metaMensalGlobal = 450000;

  const saveClientes = useCallback((updated: Cliente[]) => {
    setClientes(updated);
    localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(updated));
  }, []);

  const addCliente = useCallback((c: Omit<Cliente, 'id'>) => {
    setClientes(prev => {
      const maxId = prev.reduce((max, cl) => Math.max(max, cl.id), 0);
      const updated = [...prev, { ...c, id: maxId + 1 }];
      localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateCliente = useCallback((id: number, partial: Partial<Cliente>) => {
    setClientes(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...partial } : c);
      localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteCliente = useCallback((id: number) => {
    setClientes(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem(STORAGE_KEY_CLIENTES, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const faturamento = useMemo(() => clientes.reduce((s, c) => s + (c.entrada || 0), 0), [clientes]);
  const totalVendas = clientes.length;
  const ticketMedio = useMemo(() => totalVendas > 0 ? faturamento / totalVendas : 0, [faturamento, totalVendas]);
  const pctMeta = useMemo(() => (faturamento / metaMensalGlobal) * 100, [faturamento, metaMensalGlobal]);

  const projecao = useMemo(() => {
    const daysInMonth = 31; // March
    const currentDay = 19; // data até dia 19
    return currentDay > 0 ? (faturamento / currentDay) * daysInMonth : 0;
  }, [faturamento]);

  const vendedorStats = useMemo<VendedorStats[]>(() => {
    return vendedores.map(v => {
      const cv = clientes.filter(c => c.vendedor === v.nome);
      const fat = cv.reduce((s, c) => s + (c.entrada || 0), 0);
      const vendas = cv.length;
      const ticket = vendas > 0 ? fat / vendas : 0;
      const pct = v.meta > 0 ? (fat / v.meta) * 100 : 0;
      const faltam = Math.max(0, v.meta - fat);
      return { vendedor: v, faturamento: fat, vendas, ticketMedio: ticket, pctMeta: pct, faltam };
    }).sort((a, b) => b.faturamento - a.faturamento);
  }, [clientes, vendedores]);

  const dailyEvolution = useMemo(() => {
    const byDay: Record<string, { fat: number; dataFull: string }> = {};
    clientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { fat: 0, dataFull: c.data };
      byDay[day].fat += (c.entrada || 0);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, dataFull: d.dataFull, faturamento: d.fat }));
  }, [clientes]);

  const ticketPorDia = useMemo(() => {
    const byDay: Record<string, { total: number; count: number }> = {};
    clientes.forEach(c => {
      const day = c.data?.split('/')[0] || '00';
      if (!byDay[day]) byDay[day] = { total: 0, count: 0 };
      byDay[day].total += (c.entrada || 0);
      byDay[day].count++;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, d]) => ({ dia, ticketMedio: d.count > 0 ? d.total / d.count : 0 }));
  }, [clientes]);

  return (
    <SalesDataContext.Provider value={{
      metaMensalGlobal, vendedores, clientes,
      addCliente, updateCliente, deleteCliente,
      faturamento, totalVendas, ticketMedio, pctMeta, projecao,
      vendedorStats, dailyEvolution, ticketPorDia,
    }}>
      {children}
    </SalesDataContext.Provider>
  );
}

export function useSalesData() {
  const ctx = useContext(SalesDataContext);
  if (!ctx) throw new Error('useSalesData must be used within SalesDataProvider');
  return ctx;
}
