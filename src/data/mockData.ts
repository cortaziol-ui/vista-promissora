// Mock data - realistic 3-month sales performance data

export type UserRole = 'admin' | 'manager' | 'seller';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  position: string;
  status: 'active' | 'inactive';
  monthlyGoal: number;
  weeklyGoal: number;
}

export interface Sale {
  id: string;
  userId: string;
  value: number;
  date: string;
  client: string;
  product: string;
}

export interface Lead {
  id: string;
  date: string;
  source: string;
  campaign: string;
  cost: number;
  converted: boolean;
}

export interface NPSEntry {
  id: string;
  date: string;
  score: number;
  comment: string;
}

export interface CompanyGoal {
  monthlyGoal: number;
  annualGoal: number;
}

const avatarUrl = (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;

export const users: User[] = [
  { id: 'u1', name: 'Carlos Mendes', email: 'carlos@empresa.com', role: 'admin', avatar: avatarUrl('carlos'), position: 'Diretor Comercial', status: 'active', monthlyGoal: 0, weeklyGoal: 0 },
  { id: 'u2', name: 'Ana Souza', email: 'ana@empresa.com', role: 'manager', avatar: avatarUrl('ana'), position: 'Gerente de Vendas', status: 'active', monthlyGoal: 0, weeklyGoal: 0 },
  { id: 'u3', name: 'Rafael Lima', email: 'rafael@empresa.com', role: 'seller', avatar: avatarUrl('rafael'), position: 'Vendedor Sênior', status: 'active', monthlyGoal: 80000, weeklyGoal: 20000 },
  { id: 'u4', name: 'Juliana Costa', email: 'juliana@empresa.com', role: 'seller', avatar: avatarUrl('juliana'), position: 'Vendedora', status: 'active', monthlyGoal: 70000, weeklyGoal: 17500 },
  { id: 'u5', name: 'Pedro Santos', email: 'pedro@empresa.com', role: 'seller', avatar: avatarUrl('pedro'), position: 'Vendedor', status: 'active', monthlyGoal: 60000, weeklyGoal: 15000 },
  { id: 'u6', name: 'Mariana Oliveira', email: 'mariana@empresa.com', role: 'seller', avatar: avatarUrl('mariana'), position: 'Vendedora Sênior', status: 'active', monthlyGoal: 75000, weeklyGoal: 18750 },
  { id: 'u7', name: 'Lucas Ferreira', email: 'lucas@empresa.com', role: 'seller', avatar: avatarUrl('lucas'), position: 'Vendedor', status: 'active', monthlyGoal: 55000, weeklyGoal: 13750 },
  { id: 'u8', name: 'Beatriz Almeida', email: 'beatriz@empresa.com', role: 'seller', avatar: avatarUrl('beatriz'), position: 'Vendedora', status: 'inactive', monthlyGoal: 50000, weeklyGoal: 12500 },
];

export const companyGoal: CompanyGoal = {
  monthlyGoal: 450000,
  annualGoal: 5400000,
};

const products = ['Plano Enterprise', 'Plano Pro', 'Plano Starter', 'Consultoria', 'Implementação', 'Suporte Premium'];
const clients = ['TechCorp', 'InnovateX', 'DataFlow', 'CloudSync', 'NetPrime', 'DigitalWave', 'SmartSys', 'CoreTech', 'AlphaNet', 'ByteForce', 'CyberLink', 'FlexiTech', 'GlobalData', 'HyperNet', 'InfoPeak'];
const sources = ['Google Ads', 'Meta Ads', 'LinkedIn', 'Orgânico', 'Indicação', 'Email Marketing'];
const campaigns = ['Campanha Q1', 'Black Friday', 'Lançamento Pro', 'Remarketing', 'Brand Awareness', 'Lead Nurturing'];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateSales(): Sale[] {
  const sales: Sale[] = [];
  const sellers = users.filter(u => u.role === 'seller' && u.status === 'active');
  const now = new Date();
  
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const daysInMonth = monthOffset === 0 ? now.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    
    for (const seller of sellers) {
      const numSales = randomBetween(8, 18);
      for (let i = 0; i < numSales; i++) {
        const day = randomBetween(1, daysInMonth);
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        sales.push({
          id: `s-${seller.id}-${monthOffset}-${i}`,
          userId: seller.id,
          value: randomBetween(1500, 18000),
          date: date.toISOString().split('T')[0],
          client: clients[randomBetween(0, clients.length - 1)],
          product: products[randomBetween(0, products.length - 1)],
        });
      }
    }
  }
  return sales.sort((a, b) => a.date.localeCompare(b.date));
}

function generateLeads(): Lead[] {
  const leads: Lead[] = [];
  const now = new Date();
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const daysInMonth = monthOffset === 0 ? now.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const numLeads = randomBetween(3, 12);
      for (let i = 0; i < numLeads; i++) {
        const date = new Date(month.getFullYear(), month.getMonth(), day);
        leads.push({
          id: `l-${monthOffset}-${day}-${i}`,
          date: date.toISOString().split('T')[0],
          source: sources[randomBetween(0, sources.length - 1)],
          campaign: campaigns[randomBetween(0, campaigns.length - 1)],
          cost: randomBetween(5, 80),
          converted: Math.random() < 0.18,
        });
      }
    }
  }
  return leads;
}

function generateNPS(): NPSEntry[] {
  const entries: NPSEntry[] = [];
  const now = new Date();
  for (let monthOffset = 2; monthOffset >= 0; monthOffset--) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const daysInMonth = monthOffset === 0 ? now.getDate() : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day += randomBetween(1, 3)) {
      const date = new Date(month.getFullYear(), month.getMonth(), Math.min(day, daysInMonth));
      entries.push({
        id: `nps-${monthOffset}-${day}`,
        date: date.toISOString().split('T')[0],
        score: randomBetween(1, 10),
        comment: '',
      });
    }
  }
  return entries;
}

export const sales = generateSales();
export const leads = generateLeads();
export const npsEntries = generateNPS();

// Helper functions
export function getSalesByUser(userId: string) {
  return sales.filter(s => s.userId === userId);
}

export function getSalesByMonth(year: number, month: number) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return sales.filter(s => s.date.startsWith(prefix));
}

export function getSellerStats(userId: string, year: number, month: number) {
  const user = users.find(u => u.id === userId);
  if (!user) return null;
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const userSales = sales.filter(s => s.userId === userId && s.date.startsWith(prefix));
  const totalRevenue = userSales.reduce((sum, s) => sum + s.value, 0);
  const totalSalesCount = userSales.length;
  const avgTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;
  const goalPct = user.monthlyGoal > 0 ? (totalRevenue / user.monthlyGoal) * 100 : 0;
  const remaining = Math.max(0, user.monthlyGoal - totalRevenue);
  
  return {
    user,
    totalRevenue,
    totalSalesCount,
    avgTicket,
    goalPct,
    remaining,
    monthlyGoal: user.monthlyGoal,
    weeklyGoal: user.weeklyGoal,
  };
}

export function getAllSellerStats(year: number, month: number) {
  const sellers = users.filter(u => u.role === 'seller' && u.status === 'active');
  return sellers
    .map(u => getSellerStats(u.id, year, month)!)
    .filter(Boolean)
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function getMonthlyTotals(year: number, month: number) {
  const monthSales = getSalesByMonth(year, month);
  const totalRevenue = monthSales.reduce((sum, s) => sum + s.value, 0);
  const totalCount = monthSales.length;
  const avgTicket = totalCount > 0 ? totalRevenue / totalCount : 0;
  const goalPct = (totalRevenue / companyGoal.monthlyGoal) * 100;
  
  // Previous month for comparison
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevSales = getSalesByMonth(prevYear, prevMonth);
  const prevRevenue = prevSales.reduce((sum, s) => sum + s.value, 0);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  
  // Projection
  const now = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = year === now.getFullYear() && month === now.getMonth() ? now.getDate() : daysInMonth;
  const projection = currentDay > 0 ? (totalRevenue / currentDay) * daysInMonth : 0;
  
  return { totalRevenue, totalCount, avgTicket, goalPct, revenueChange, projection, companyGoal: companyGoal.monthlyGoal };
}
