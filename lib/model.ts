export type ExpenseItem = { id: string; label: string; value: number };
export type ExpenseGroup = { id: string; name: string; color: string; items: ExpenseItem[] };

export const GROUPS: ExpenseGroup[] = [
  {
    id: "casa",
    name: "Casa",
    color: "#8b5cf6",
    items: [
      { id: "condominio", label: "Condomínio", value: 0 },
      { id: "luzgas", label: "Eletricidade e gás", value: 85 },
      { id: "agua", label: "Água", value: 20 },
      { id: "internet", label: "Internet", value: 35 },
      { id: "segurocasa", label: "Seguro de casa", value: 10 },
    ],
  },
  {
    id: "dia",
    name: "Dia-a-dia",
    color: "#0ea5e9",
    items: [
      { id: "super", label: "Supermercado (2 pessoas)", value: 400 },
      { id: "higiene", label: "Higiene e cuidados", value: 35 },
      { id: "prodcasa", label: "Produtos de casa", value: 25 },
      { id: "fora", label: "Restaurantes e take-away", value: 180 },
    ],
  },
  {
    id: "mob",
    name: "Mobilidade",
    color: "#14b8a6",
    items: [
      { id: "combustivel", label: "Combustível", value: 140 },
      { id: "transportes", label: "Transportes públicos", value: 20 },
      { id: "auto", label: "Seguro e manutenção auto", value: 35 },
    ],
  },
  {
    id: "pess",
    name: "Pessoal e lazer",
    color: "#f472b6",
    items: [
      { id: "telemovel", label: "Telemóveis", value: 20 },
      { id: "saude", label: "Saúde e farmácia", value: 25 },
      { id: "lazer", label: "Lazer e subscrições", value: 80 },
      { id: "roupa", label: "Roupa e calçado", value: 30 },
    ],
  },
  {
    id: "res",
    name: "Reservas",
    color: "#f59e0b",
    items: [
      { id: "imprevistos", label: "Imprevistos", value: 100 },
      { id: "outros", label: "Outros", value: 30 },
    ],
  },
];

export const CHECKS = [
  "O subsídio de alimentação está incluído nos líquidos?",
  "Quantos carros usamos e quantos km fazemos por mês?",
  "A casa está mobilada ou temos de equipar?",
  "Há empréstimos, créditos ou prestações a contar?",
  "Água quente: gás ou eletricidade?",
  "O condomínio está incluído na renda?",
  "Quem é responsável por obras e avarias?",
  "O contrato tem duração mínima ou fidelização?",
];

export type ViewId =
  | "overview"
  | "income"
  | "expenses"
  | "split"
  | "savings"
  | "scenarios"
  | "upfront"
  | "checklist";

export type NavItem = { id: ViewId; label: string; title: string; blurb: string; icon: string };

export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Resumo",
    items: [
      {
        id: "overview",
        label: "Visão geral",
        title: "Visão geral",
        blurb: "O retrato do mês: o que entra, o que sai e como se distribui.",
        icon: "grid",
      },
    ],
  },
  {
    group: "Entradas",
    items: [
      {
        id: "income",
        label: "Rendimentos",
        title: "Rendimentos",
        blurb:
          "Valores líquidos por pagamento. Os meses extra contam apenas para a projeção anual.",
        icon: "wallet",
      },
      {
        id: "expenses",
        label: "Despesas",
        title: "Despesas mensais",
        blurb: "A renda e cinco categorias de custos recorrentes, com o peso de cada uma.",
        icon: "receipt",
      },
    ],
  },
  {
    group: "Análise",
    items: [
      {
        id: "split",
        label: "Divisão",
        title: "Divisão dos custos",
        blurb: "Metade cada um, ou proporcional a quem ganha mais.",
        icon: "users",
      },
      {
        id: "savings",
        label: "Poupança",
        title: "Poupança e objetivos",
        blurb: "Projeção a 12 meses, subsídios incluídos, e o tempo até ao objetivo.",
        icon: "trend",
      },
      {
        id: "scenarios",
        label: "Cenários",
        title: "Comparar rendas",
        blurb: "Mantendo tudo o resto igual, o impacto de cada valor de renda.",
        icon: "sliders",
      },
      {
        id: "upfront",
        label: "Entrada",
        title: "Custo de entrada",
        blurb: "O capital inicial para assinar o contrato e equipar a casa.",
        icon: "key",
      },
    ],
  },
  {
    group: "Preparação",
    items: [
      {
        id: "checklist",
        label: "Checklist",
        title: "Checklist pré-contrato",
        blurb: "Confirmar antes de assinar — é aqui que o orçamento se decide.",
        icon: "check",
      },
    ],
  },
];

export const NAV_FLAT: NavItem[] = NAV.flatMap((g) => g.items);

export type Values = {
  mine: number;
  mineN: number;
  hers: number;
  hersN: number;
  rent: number;
  goal: number;
  depositN: number;
  advanceN: number;
  furniture: number;
  moving: number;
  expenses: Record<string, number>;
};

export type Mode = "proportional" | "equal";

export const DEFAULTS: Values = {
  mine: 1300,
  mineN: 14,
  hers: 1600,
  hersN: 12,
  rent: 800,
  goal: 10000,
  depositN: 1,
  advanceN: 0,
  furniture: 1000,
  moving: 200,
  expenses: Object.fromEntries(
    GROUPS.flatMap((g) => g.items.map((i) => [i.id, i.value] as const))
  ),
};

export const RENT_COLOR = "#6366f1";
export const LEFT_COLOR = "#22c55e";

export const euro = (x: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(x || 0));

export const pct = (x: number) =>
  new Intl.NumberFormat("pt-PT", { style: "percent", maximumFractionDigits: 1 }).format(x || 0);

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export type Computed = ReturnType<typeof compute>;

export function compute(v: Values, mode: Mode) {
  const income = v.mine + v.hers;

  const groupSums: Record<string, number> = {};
  let other = 0;
  for (const g of GROUPS) {
    const s = g.items.reduce((a, i) => a + (v.expenses[i.id] || 0), 0);
    groupSums[g.id] = s;
    other += s;
  }

  const total = other + v.rent;
  const left = income - total;
  const yearIncome = v.mine * v.mineN + v.hers * v.hersN;
  const annual = yearIncome - total * 12;
  const rate = income > 0 ? left / income : 0;
  const rentShare = income > 0 ? v.rent / income : 0;
  const perMonth = annual / 12;

  const part = mode === "equal" ? 0.5 : income > 0 ? v.mine / income : 0.5;
  const mineShare = total * part;
  const herShare = total - mineShare;

  const upRent = v.rent * (1 + v.depositN + v.advanceN);
  const upOther = v.furniture + v.moving;
  const upfront = upRent + upOther;

  const rentsBase = [600, 700, 800, 900, 1000, 1100];
  const rents = rentsBase.includes(v.rent) ? [...rentsBase] : [...rentsBase, v.rent];
  rents.sort((a, b) => a - b);
  const scenarios = rents.map((r) => ({
    rent: r,
    left: income - other - r,
    annual: yearIncome - (other + r) * 12,
    share: income > 0 ? r / income : 0,
    current: r === v.rent,
  }));

  const health: { label: string; tone: "ok" | "warn" | "bad" } =
    left < 0
      ? { label: "Orçamento negativo", tone: "bad" }
      : left < 300
        ? { label: "Pouca margem", tone: "warn" }
        : left < 600
          ? { label: "Margem moderada", tone: "warn" }
          : { label: "Equilibrado", tone: "ok" };

  return {
    income, groupSums, other, total, left, yearIncome, annual, rate, rentShare,
    perMonth, mineShare, herShare, upRent, upOther, upfront, scenarios, health,
  };
}
