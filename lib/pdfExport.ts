import { jsPDF } from "jspdf";
import {
  CHECKS,
  GROUPS,
  compute,
  type Computed,
  type Mode,
  type Values,
} from "./model";

// Export pipeline: the simulation is laid out into a list of drawing operations per page
// (millimetres). The same list is rendered as SVG for the on-screen preview and replayed into
// jsPDF for the saved file, so the preview is exactly what gets written.

export type RGB = [number, number, number];
export type Op =
  | {
      kind: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      bold: boolean;
      color: RGB;
      align: "left" | "right" | "center";
      spacing: number;
    }
  | {
      kind: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      r: number;
      fill: RGB | null;
      stroke: RGB | null;
      lw: number;
    }
  | { kind: "line"; x1: number; y1: number; x2: number; y2: number; color: RGB; lw: number }
  | { kind: "circle"; x: number; y: number; r: number; fill: RGB };

export type ExportDoc = {
  width: number;
  height: number;
  pages: Op[][];
  title: string;
  items: number;
};

export type SectionKey =
  | "income"
  | "expenses"
  | "split"
  | "savings"
  | "scenarios"
  | "upfront"
  | "checklist";

export type ExportSections = Record<SectionKey, boolean>;

export type ExportOptions = {
  title: string; // empty = automatic
  paper: "a4" | "letter";
  orientation: "portrait" | "landscape";
  sections: ExportSections;
  showAllocation: boolean;
};

export type ExportSource = { values: Values; mode: Mode };

export const PT = 0.3528; // one typographic point in millimetres
const M = 20; // page margin
const RUN = 12; // top band reserved on every page after the first, for the running header

const INK: RGB = [22, 24, 30];
const BODY: RGB = [44, 47, 56];
const MUTED: RGB = [112, 117, 130];
const SOFT: RGB = [176, 180, 190];
const HAIR: RGB = [232, 233, 239];
const RULE: RGB = [214, 216, 224];
const BAND: RGB = [246, 246, 250];
const ACCENT: RGB = [17, 125, 88]; // print-safe version of the interface mint
const RED: RGB = [190, 52, 74];
const AMBER: RGB = [160, 100, 22];
const WHITE: RGB = [255, 255, 255];

// Screen colours are tuned for a dark background; on paper they need a little more weight.
const PRINT_COLOR: Record<string, RGB> = {
  rent: [79, 70, 229],
  casa: [124, 58, 237],
  dia: [2, 132, 199],
  mob: [13, 148, 136],
  pess: [219, 39, 119],
  res: [217, 119, 6],
  left: [22, 163, 74],
};

const SECTION_NAMES: Record<SectionKey, string> = {
  income: "Rendimentos",
  expenses: "Despesas mensais",
  split: "Divisão dos custos",
  savings: "Poupança e objetivos",
  scenarios: "Comparação de rendas",
  upfront: "Custo de entrada",
  checklist: "Checklist pré-contrato",
};

export const ALL_SECTIONS: SectionKey[] = [
  "income",
  "expenses",
  "split",
  "savings",
  "scenarios",
  "upfront",
  "checklist",
];

// The built-in PDF fonts use WinAnsi: accented Latin characters and the euro sign are fine,
// but typographic punctuation is mapped to plain equivalents and anything else becomes "?".
const PLAIN: Record<string, string> = {
  "—": "-",
  "–": "-",
  "…": "...",
  "“": '"',
  "”": '"',
  "‘": "'",
  "’": "'",
  "•": "-",
  " ": " ",
  " ": " ",
  " ": " ",
};
const clean = (text: string) =>
  text
    .replace(/[—–…“”‘’•   ]/g, (char) => PLAIN[char])
    .replace(/\t/g, "    ")
    .replace(/[^\n\x20-\x7e¡-ÿ€]+/g, "?");

const tint = (color: RGB, amount: number): RGB =>
  [0, 1, 2].map((i) => Math.round(color[i] + (255 - color[i]) * amount)) as RGB;

/**
 * Currency for the page. Uses the same pt-PT formatting as the interface so a value
 * reads identically on screen and in the export; the non-breaking spaces Intl emits are
 * flattened to plain ones, which measure and render predictably in the PDF fonts.
 */
export const money = (x: number) =>
  new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  })
    .format(Math.round(x || 0))
    .replace(/[   ]/g, " ");
const percent = (x: number) =>
  `${((x || 0) * 100).toLocaleString("pt-PT", { maximumFractionDigits: 1 })}%`;

let ruler: jsPDF | undefined;
type TextOptions = {
  size?: number;
  bold?: boolean;
  color?: RGB;
  align?: "left" | "right" | "center";
  spacing?: number;
};
type FlowOptions = {
  size?: number;
  bold?: boolean;
  color?: RGB;
  x?: number;
  width?: number;
  leading?: number;
};

class Layout {
  pages: Op[][] = [[]];
  pageSections: string[] = [""]; // which section each page carries, for the running header
  section = "";
  y = M;
  constructor(
    readonly W: number,
    readonly H: number
  ) {}
  get right() {
    return this.W - M;
  }
  get inner() {
    return this.W - M * 2;
  }
  // The first page carries the full masthead; every page after it reserves a band for the running header.
  get top() {
    return this.pages.length > 1 ? M + RUN : M;
  }
  get bottom() {
    return this.H - 21;
  }
  get ops() {
    return this.pages[this.pages.length - 1];
  }
  get page() {
    return this.pages.length;
  }
  newPage() {
    this.pages.push([]);
    this.pageSections.push(this.section);
    this.y = this.top;
  }
  ensure(height: number) {
    if (this.y + height > this.bottom && this.y > this.top) this.newPage();
  }
  // Opens a section on a fresh page so each one starts at a predictable place.
  startSection(name: string) {
    this.section = name;
    this.newPage();
  }

  private measure(size: number, bold: boolean) {
    ruler ??= new jsPDF({ unit: "mm", format: "a4" });
    ruler.setFont("helvetica", bold ? "bold" : "normal");
    ruler.setFontSize(size);
    return ruler;
  }
  width(text: string, size: number, bold = false) {
    return this.measure(size, bold).getTextWidth(clean(text));
  }
  wrap(text: string, size: number, bold: boolean, width: number): string[] {
    return this.measure(size, bold).splitTextToSize(clean(text), width) as string[];
  }
  fit(text: string, size: number, bold: boolean, width: number) {
    const pen = this.measure(size, bold);
    let value = clean(text).replace(/\s*\n\s*/g, " ");
    if (pen.getTextWidth(value) <= width) return value;
    while (value.length > 1 && pen.getTextWidth(`${value}...`) > width) value = value.slice(0, -1);
    return `${value.trimEnd()}...`;
  }

  // `top` is the top of the text line; the stored y is the baseline.
  text(text: string, x: number, top: number, o: TextOptions = {}) {
    if (!text) return;
    const { size = 10, bold = false, color = INK, align = "left", spacing = 0 } = o;
    this.ops.push({
      kind: "text",
      x,
      y: top + size * PT * 0.8,
      text: clean(text),
      size,
      bold,
      color,
      align,
      spacing,
    });
  }
  // A text op left blank on purpose: the caller fills it in after layout, when page numbers are known.
  slot(x: number, top: number, o: TextOptions = {}) {
    const { size = 10, bold = false, color = INK, align = "left" as const, spacing = 0 } = o;
    const op = {
      kind: "text" as const,
      x,
      y: top + size * PT * 0.8,
      text: "",
      size,
      bold,
      color,
      align,
      spacing,
    };
    this.ops.push(op);
    return op;
  }
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    { r = 0, fill = null as RGB | null, stroke = null as RGB | null, lw = 0.2 } = {}
  ) {
    if (w > 0 && h > 0) this.ops.push({ kind: "rect", x, y, w, h, r, fill, stroke, lw });
  }
  line(x1: number, y1: number, x2: number, y2: number, color: RGB = HAIR, lw = 0.2) {
    this.ops.push({ kind: "line", x1, y1, x2, y2, color, lw });
  }
  circle(x: number, y: number, r: number, fill: RGB) {
    this.ops.push({ kind: "circle", x, y, r, fill });
  }
  hair(from = M, color: RGB = HAIR) {
    this.line(from, this.y, this.right, this.y, color);
  }
  pill(label: string, x: number, top: number, fill: RGB, color: RGB, size = 7) {
    const w = this.width(label, size, true) + 4.6;
    const h = size * PT + 2.2;
    this.rect(x, top, w, h, { r: h / 2, fill });
    this.text(label, x + w / 2, top + 1.1 + size * PT * 0.04, {
      size,
      bold: true,
      color,
      align: "center",
    });
    return w;
  }
  // Wrapped text that flows across pages line by line.
  flow(text: string, o: FlowOptions = {}) {
    const { size = 10, bold = false, color = INK, x = M, leading = 1.45 } = o;
    const width = o.width ?? this.right - x;
    const advance = size * PT * leading;
    for (const line of this.wrap(text, size, bold, width)) {
      this.ensure(advance);
      this.text(line, x, this.y + (advance - size * PT) / 2, { size, bold, color });
      this.y += advance;
    }
  }
}

/* ---------------------------------------------------------------- chrome */

function header(l: Layout, title: string, subtitle: string) {
  const compact = l.W > l.H;
  l.rect(M, l.y, 8.5, 8.5, { r: 2.2, fill: [23, 25, 31] });
  l.text("cd.", M + 4.25, l.y + 2.1, {
    size: 10,
    bold: true,
    color: [142, 240, 198],
    align: "center",
  });
  l.text("Casa a Dois", M + 11.5, l.y + 2.5, { size: 10, bold: true });
  l.text(
    new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" }),
    l.right,
    l.y + 2.7,
    { size: 9, color: MUTED, align: "right" }
  );
  l.y += 8.5 + (compact ? 9 : 15);
  l.flow(title, { size: 27, bold: true, leading: 1.15 });
  l.y += 2.5;
  l.flow(subtitle, { size: 10.5, color: MUTED });
  l.y += compact ? 6 : 9;
}

function stats(l: Layout, items: { label: string; value: string; color?: RGB }[]) {
  const gap = 4;
  const w = (l.inner - gap * (items.length - 1)) / items.length;
  items.forEach((item, index) => {
    const x = M + index * (w + gap);
    l.rect(x, l.y, w, 19, { r: 2.6, fill: BAND });
    l.text(l.fit(item.value, 15, true, w - 9), x + 5, l.y + 4.2, {
      size: 15,
      bold: true,
      color: item.color || INK,
    });
    l.text(item.label.toUpperCase(), x + 5, l.y + 12.6, {
      size: 6.8,
      bold: true,
      color: MUTED,
      spacing: 0.25,
    });
  });
  l.y += 19 + 6;
}

/** Stacked allocation bar with legend — the summary page's one piece of graphics. */
function allocation(l: Layout, parts: { name: string; value: number; color: RGB }[], base: number) {
  const H = 6.4;
  l.text("DISTRIBUIÇÃO DO RENDIMENTO", M, l.y, {
    size: 6.8,
    bold: true,
    color: MUTED,
    spacing: 0.3,
  });
  l.y += 6.2;
  l.rect(M, l.y, l.inner, H, { r: H / 2, fill: BAND });
  let x = M;
  const visible = parts.filter((p) => p.value > 0);
  visible.forEach((part, index) => {
    const w = Math.max(0.8, (part.value / base) * l.inner);
    const capped = Math.min(w, l.right - x);
    if (capped <= 0) return;
    const first = index === 0;
    const last = index === visible.length - 1;
    l.rect(x, l.y, capped, H, {
      r: first || last ? H / 2 : 0,
      fill: part.color,
    });
    // Square off the inner edge so adjacent segments meet cleanly.
    if (first && !last) l.rect(x + capped - H / 2, l.y, H / 2, H, { fill: part.color });
    if (last && !first) l.rect(x, l.y, H / 2, H, { fill: part.color });
    x += capped;
  });
  l.y += H + 6;

  // legend, two columns
  const colW = l.inner / 2;
  const rows = Math.ceil(parts.length / 2);
  parts.forEach((part, index) => {
    const col = Math.floor(index / rows);
    const row = index % rows;
    const lx = M + col * colW;
    const ly = l.y + row * 5.6;
    l.circle(lx + 1.4, ly + 1.8, 1.4, part.color);
    l.text(l.fit(part.name, 9, false, colW - 32), lx + 4.6, ly, { size: 9, color: BODY });
    l.text(money(part.value), lx + colW - 20, ly, {
      size: 9,
      bold: true,
      align: "right",
    });
    l.text(base > 0 ? percent(part.value / base) : "-", lx + colW - 4, ly + 0.3, {
      size: 8,
      color: MUTED,
      align: "right",
    });
  });
  l.y += rows * 5.6 + 5;
}

function sectionHead(l: Layout, title: string, detail: string) {
  l.rect(M, l.y, 14, 1.4, { r: 0.7, fill: ACCENT });
  l.y += 6.5;
  l.text(title, M, l.y, { size: 19, bold: true });
  l.text(detail, l.right, l.y + 3.8, { size: 9.5, color: MUTED, align: "right" });
  l.y += 19 * PT + 5;
  l.hair(M, RULE);
  l.y += 9;
}

// Table of contents on the summary page. The page numbers are filled in after layout.
function contents(l: Layout, rows: { name: string; detail: string }[]) {
  l.y += 2;
  l.text("CONTEÚDO", M, l.y, { size: 6.8, bold: true, color: MUTED, spacing: 0.3 });
  l.y += 6.4;
  l.hair(M, RULE);
  return rows.map((row, index) => {
    l.y += 4.6;
    l.text(String(index + 1).padStart(2, "0"), M, l.y + 1.4, {
      size: 8.5,
      bold: true,
      color: ACCENT,
    });
    l.text(row.name, M + 9.5, l.y, { size: 11.5, bold: true });
    l.text(row.detail, M + 9.5 + l.width(row.name, 11.5, true) + 6, l.y + 1.6, {
      size: 8.5,
      color: MUTED,
    });
    const slot = l.slot(l.right, l.y + 0.6, { size: 10, bold: true, align: "right" });
    l.y += 7.4;
    l.hair();
    return slot;
  });
}

// Drawn on every page after the first, so a page torn out of the middle still says what it is.
function runningHead(ops: Op[], l: Layout, label: string, title: string) {
  const baseline = M + 1.4 + 8.5 * PT * 0.8;
  ops.push({ kind: "rect", x: M, y: M, w: 5.8, h: 5.8, r: 1.5, fill: [23, 25, 31], stroke: null, lw: 0 });
  ops.push({
    kind: "text",
    x: M + 2.9,
    y: M + 1.5 + 6.5 * PT * 0.8,
    text: "cd.",
    size: 6.5,
    bold: true,
    color: [142, 240, 198],
    align: "center",
    spacing: 0,
  });
  ops.push({
    kind: "text",
    x: M + 8.6,
    y: baseline,
    text: clean(label || title),
    size: 8.5,
    bold: true,
    color: INK,
    align: "left",
    spacing: 0,
  });
  if (label && label !== title)
    ops.push({
      kind: "text",
      x: l.right,
      y: baseline,
      text: clean(title),
      size: 8.5,
      bold: false,
      color: MUTED,
      align: "right",
      spacing: 0,
    });
  ops.push({ kind: "line", x1: M, y1: M + 8.6, x2: l.right, y2: M + 8.6, color: HAIR, lw: 0.2 });
}

/* ---------------------------------------------------------------- blocks */

/** Label / value rows with a hairline between them. `emphasis` draws a heavier rule above. */
function rows(
  l: Layout,
  items: { label: string; value: string; note?: string; color?: RGB; emphasis?: boolean }[]
) {
  const advance = 10 * PT * 1.4;
  for (const item of items) {
    l.ensure(advance + 6);
    if (item.emphasis) {
      l.hair(M, RULE);
      l.y += 3.4;
    }
    const size = item.emphasis ? 11 : 10;
    l.text(item.label, M, l.y + (advance - size * PT) / 2, {
      size,
      bold: item.emphasis,
      color: item.emphasis ? INK : BODY,
    });
    if (item.note)
      l.text(item.note, l.right - 34, l.y + (advance - 8.5 * PT) / 2, {
        size: 8.5,
        color: MUTED,
        align: "right",
      });
    l.text(item.value, l.right, l.y + (advance - size * PT) / 2, {
      size: item.emphasis ? 12 : 10,
      bold: true,
      color: item.color || INK,
      align: "right",
    });
    l.y += advance + 2.6;
    if (!item.emphasis) l.hair();
  }
  l.y += 3;
}

/** Column header band, as used by the expense and scenario tables. */
function tableHead(l: Layout, cols: { label: string; x: number; align?: "left" | "right" }[]) {
  l.rect(M, l.y, l.inner, 7.2, { r: 1.6, fill: BAND });
  for (const col of cols)
    l.text(col.label.toUpperCase(), col.x, l.y + 2.5, {
      size: 6.8,
      bold: true,
      color: MUTED,
      spacing: 0.3,
      align: col.align || "left",
    });
  l.y += 7.2;
}

function meter(l: Layout, label: string, value: string, ratio: number, tone: RGB) {
  l.ensure(14);
  l.text(label, M, l.y, { size: 9.5, color: BODY });
  l.text(value, l.right, l.y, { size: 9.5, bold: true, align: "right" });
  l.y += 6;
  l.rect(M, l.y, l.inner, 1.6, { r: 0.8, fill: [236, 237, 242] });
  const w = Math.max(0, Math.min(1, ratio)) * l.inner;
  if (w > 0) l.rect(M, l.y, Math.max(1.6, w), 1.6, { r: 0.8, fill: tone });
  l.y += 1.6 + 6;
}

function empty(l: Layout, text: string) {
  l.text(text, M, l.y, { size: 9.5, color: MUTED });
  l.y += 10;
}

/* ---------------------------------------------------------------- sections */

function writeIncome(l: Layout, v: Values, c: Computed): number {
  const half = (l.inner - 5) / 2;
  const people: { name: string; role: string; net: number; n: number }[] = [
    { name: "Eu", role: "Software", net: v.mine, n: v.mineN },
    { name: "Ela", role: "Função pública", net: v.hers, n: v.hersN },
  ];
  l.ensure(34);
  people.forEach((p, i) => {
    const x = M + i * (half + 5);
    l.rect(x, l.y, half, 30, { r: 2.6, stroke: HAIR, lw: 0.3 });
    l.text(p.name.toUpperCase(), x + 6, l.y + 5.4, {
      size: 6.8,
      bold: true,
      color: MUTED,
      spacing: 0.3,
    });
    l.text(money(p.net), x + 6, l.y + 11, { size: 16, bold: true });
    l.text(`${p.role}  ·  ${p.n} pagamentos/ano`, x + 6, l.y + 21.4, { size: 8.5, color: MUTED });
  });
  l.y += 30 + 9;

  rows(l, [
    { label: "Rendimento conjunto (mês normal)", value: money(c.income) },
    {
      label: "Diferença entre os dois",
      value: money(Math.abs(v.mine - v.hers)),
      note: c.income > 0 ? percent(Math.abs(v.mine - v.hers) / c.income) : "",
    },
    { label: "Rendimento líquido anual", value: money(c.yearIncome), emphasis: true },
  ]);

  l.flow(
    "Os valores são líquidos por pagamento. Confirmem se o subsídio de alimentação já está incluído — é a diferença mais comum entre o recibo e o que entra na conta.",
    { size: 9, color: MUTED, leading: 1.5 }
  );
  return 2;
}

function writeExpenses(l: Layout, v: Values, c: Computed): number {
  // renda highlight
  l.ensure(26);
  l.rect(M, l.y, l.inner, 21, { r: 2.6, fill: BAND });
  l.text("RENDA DO T1", M + 6, l.y + 4.6, { size: 6.8, bold: true, color: MUTED, spacing: 0.3 });
  l.text(money(v.rent), M + 6, l.y + 10, { size: 17, bold: true });
  const share = c.income > 0 ? c.rentShare : 0;
  const tone =
    share > 0.4
      ? { fill: [252, 231, 235] as RGB, text: RED }
      : share > 0.3
        ? { fill: [253, 241, 222] as RGB, text: AMBER }
        : { fill: tint(ACCENT, 0.86), text: ACCENT };
  l.pill(
    `${c.income > 0 ? percent(share) : "-"} DO RENDIMENTO`,
    l.right - 6 - (l.width(`${c.income > 0 ? percent(share) : "-"} DO RENDIMENTO`, 7, true) + 4.6),
    l.y + 7.4,
    tone.fill,
    tone.text,
    7
  );
  l.y += 21 + 9;

  const pcX = l.right - 46;
  const amtX = l.right;
  let count = 0;

  GROUPS.forEach((g, index) => {
    const sum = c.groupSums[g.id];
    const color = PRINT_COLOR[g.id] || ACCENT;
    l.ensure(34);
    l.circle(M + 1.6, l.y + 2.3, 1.6, color);
    l.text(g.name, M + 6, l.y, { size: 12.5, bold: true });
    l.text(money(sum), l.right, l.y + 0.6, { size: 11.5, bold: true, align: "right" });
    l.y += 8;
    l.rect(M, l.y, l.inner, 1.2, { r: 0.6, fill: [236, 237, 242] });
    if (c.total > 0) l.rect(M, l.y, Math.max(1.2, (l.inner * sum) / c.total), 1.2, { r: 0.6, fill: color });
    l.y += 1.2 + 5;

    tableHead(l, [
      { label: "Rubrica", x: M + 3 },
      { label: "% do total", x: pcX, align: "right" },
      { label: "Valor", x: amtX - 3, align: "right" },
    ]);

    const advance = 10 * PT * 1.4;
    for (const item of g.items) {
      const value = v.expenses[item.id] ?? 0;
      l.ensure(advance + 5.4);
      const top = l.y + 2.7;
      l.text(l.fit(item.label, 10, false, pcX - M - 10), M + 3, top, {
        size: 10,
        color: value > 0 ? INK : SOFT,
      });
      l.text(c.total > 0 ? percent(value / c.total) : "-", pcX, top + 0.3, {
        size: 8.5,
        color: MUTED,
        align: "right",
      });
      l.text(money(value), amtX - 3, top, {
        size: 10,
        bold: value > 0,
        color: value > 0 ? INK : SOFT,
        align: "right",
      });
      l.y += advance + 5.4;
      l.hair();
      count += 1;
    }
    l.y += index < GROUPS.length - 1 ? 10 : 6;
  });

  rows(l, [
    { label: "Renda", value: money(v.rent) },
    { label: "Custos recorrentes", value: money(c.other) },
    { label: "Despesa total por mês", value: money(c.total), emphasis: true },
  ]);
  return count;
}

function writeSplit(l: Layout, v: Values, c: Computed, mode: Mode): number {
  const quota = c.total > 0 ? c.mineShare / c.total : 0.5;
  l.text(
    mode === "equal" ? "Método: 50 / 50" : "Método: proporcional ao rendimento",
    M,
    l.y,
    { size: 9.5, bold: true, color: ACCENT }
  );
  l.y += 9;

  const half = (l.inner - 5) / 2;
  const people = [
    { name: "Eu", pays: c.mineShare, net: v.mine, quota },
    { name: "Ela", pays: c.herShare, net: v.hers, quota: 1 - quota },
  ];
  l.ensure(40);
  people.forEach((p, i) => {
    const x = M + i * (half + 5);
    const free = p.net - p.pays;
    l.rect(x, l.y, half, 36, { r: 2.6, stroke: HAIR, lw: 0.3 });
    l.text(p.name.toUpperCase(), x + 6, l.y + 5.4, {
      size: 6.8,
      bold: true,
      color: MUTED,
      spacing: 0.3,
    });
    l.text(money(p.pays), x + 6, l.y + 11, { size: 16, bold: true });
    l.text(`${percent(p.quota)} da despesa conjunta`, x + 6, l.y + 21.2, {
      size: 8.5,
      color: MUTED,
    });
    l.line(x + 6, l.y + 26.4, x + half - 6, l.y + 26.4, HAIR);
    l.text("Fica com", x + 6, l.y + 28.8, { size: 8.5, color: MUTED });
    l.text(money(free), x + half - 6, l.y + 28.4, {
      size: 10,
      bold: true,
      color: free >= 0 ? ACCENT : RED,
      align: "right",
    });
  });
  l.y += 36 + 9;

  rows(l, [
    { label: "Despesa total do casal", value: money(c.total) },
    { label: "Quota minha", value: money(c.mineShare), note: percent(quota) },
    { label: "Quota dela", value: money(c.herShare), note: percent(1 - quota) },
    {
      label: "Sobra conjunta no fim do mês",
      value: money(c.left),
      color: c.left >= 0 ? ACCENT : RED,
      emphasis: true,
    },
  ]);

  l.flow(
    "O cálculo assume que todas as despesas listadas são partilhadas. Gastos estritamente pessoais devem ficar fora da conta conjunta.",
    { size: 9, color: MUTED, leading: 1.5 }
  );
  return 2;
}

function writeSavings(l: Layout, v: Values, c: Computed): number {
  stats(l, [
    { label: "Sobra mensal", value: money(c.left), color: c.left >= 0 ? ACCENT : RED },
    { label: "Média anualizada", value: money(c.perMonth) },
    { label: "Saldo anual", value: money(c.annual), color: c.annual >= 0 ? ACCENT : RED },
  ]);

  rows(l, [
    { label: "Rendimento líquido anual", value: money(c.yearIncome) },
    { label: "Despesas anuais (12 meses)", value: `- ${money(c.total * 12)}` },
    {
      label: "Saldo anual projetado",
      value: money(c.annual),
      color: c.annual >= 0 ? ACCENT : RED,
      emphasis: true,
    },
  ]);

  if (v.goal > 0) {
    l.ensure(30);
    l.text("Objetivo de poupança", M, l.y, { size: 12.5, bold: true });
    l.text(money(v.goal), l.right, l.y + 0.6, { size: 11.5, bold: true, align: "right" });
    l.y += 9;
    const months = c.perMonth > 0 ? v.goal / c.perMonth : 0;
    const label =
      c.perMonth <= 0
        ? "Sem margem de poupança ao ritmo atual"
        : months <= 12
          ? `Atingido em ${Math.ceil(months)} meses`
          : `Atingido em ${(months / 12).toFixed(1).replace(".", ",")} anos`;
    meter(
      l,
      label,
      c.perMonth > 0 ? `${money(c.perMonth)} / mês` : "-",
      c.perMonth > 0 ? c.annual / v.goal : 0,
      c.perMonth > 0 ? ACCENT : RED
    );
  }

  l.flow(
    "A média anualizada inclui subsídios de férias e de Natal, por isso é superior à sobra de um mês normal. Para planear pagamentos mensais, usem sempre o mês normal.",
    { size: 9, color: MUTED, leading: 1.5 }
  );
  return 1;
}

function writeScenarios(l: Layout, c: Computed): number {
  const leftX = M + 54;
  const annualX = M + 104;
  tableHead(l, [
    { label: "Renda", x: M + 3 },
    { label: "Sobra / mês", x: leftX, align: "right" },
    { label: "Poupança / ano", x: annualX, align: "right" },
    { label: "% do rendimento", x: l.right - 3, align: "right" },
  ]);
  const advance = 10 * PT * 1.4;
  for (const s of c.scenarios) {
    l.ensure(advance + 5.4);
    const top = l.y + 2.7;
    if (s.current) {
      l.rect(M, l.y, l.inner, advance + 5.4, { fill: tint(ACCENT, 0.93) });
      l.rect(M, l.y, 0.9, advance + 5.4, { fill: ACCENT });
    }
    l.text(money(s.rent), M + 3, top, { size: 10, bold: s.current });
    if (s.current)
      l.pill("ATUAL", M + 3 + l.width(money(s.rent), 10, true) + 3, top - 0.3, tint(ACCENT, 0.84), ACCENT, 6.2);
    l.text(money(s.left), leftX, top, {
      size: 10,
      bold: s.current,
      color: s.left < 0 ? RED : INK,
      align: "right",
    });
    l.text(money(s.annual), annualX, top, {
      size: 10,
      bold: s.current,
      color: s.annual < 0 ? RED : INK,
      align: "right",
    });
    l.text(c.income > 0 ? percent(s.share) : "-", l.right - 3, top, {
      size: 10,
      bold: s.current,
      color: s.share > 0.4 ? RED : s.share > 0.3 ? AMBER : MUTED,
      align: "right",
    });
    l.y += advance + 5.4;
    l.hair();
  }
  l.y += 8;

  const best = c.scenarios[0];
  const current = c.scenarios.find((s) => s.current);
  if (best && current)
    l.flow(
      `Entre ${money(best.rent)} e a renda atual de ${money(current.rent)} há uma diferença de ${money(Math.abs(current.annual - best.annual))} por ano. É normalmente a decisão com mais impacto no orçamento — mais do que cortar em supermercado ou lazer.`,
      { size: 9, color: MUTED, leading: 1.5 }
    );
  return c.scenarios.length;
}

function writeUpfront(l: Layout, v: Values, c: Computed): number {
  const months = c.perMonth > 0 ? Math.ceil(c.upfront / c.perMonth) : null;
  stats(l, [
    { label: "Total à entrada", value: money(c.upfront), color: AMBER },
    { label: "Meses para juntar", value: months !== null ? `${months}` : "-" },
    { label: "Reserva sugerida", value: money(c.total * 3) },
  ]);

  rows(l, [
    { label: "Primeira renda", value: money(v.rent) },
    {
      label: `Caução (${v.depositN} ${v.depositN === 1 ? "mês" : "meses"})`,
      value: money(v.rent * v.depositN),
    },
    {
      label: `Rendas adiantadas (${v.advanceN})`,
      value: money(v.rent * v.advanceN),
    },
    { label: "Móveis e equipamento", value: money(v.furniture) },
    { label: "Mudanças e instalações", value: money(v.moving) },
    { label: "Total à entrada", value: money(c.upfront), color: AMBER, emphasis: true },
  ]);

  l.flow(
    `Deixem o fundo de emergência fora desta conta. O ideal é entrar com a caução paga e ainda três meses de despesas de reserva — ${money(c.total * 3)} no vosso caso.`,
    { size: 9, color: MUTED, leading: 1.5 }
  );
  return 5;
}

function writeChecklist(l: Layout, checked: boolean[]): number {
  const done = checked.filter(Boolean).length;
  meter(
    l,
    `Confirmado: ${done} de ${CHECKS.length}`,
    percent(done / CHECKS.length),
    done / CHECKS.length,
    ACCENT
  );
  l.y += 2;
  const textX = M + 10;
  const advance = 10 * PT * 1.45;
  CHECKS.forEach((text, index) => {
    const lines = l.wrap(text, 10, false, l.right - textX);
    const height = lines.length * advance + 5.4;
    l.ensure(height);
    const top = l.y + 2.7;
    const on = !!checked[index];
    if (on) {
      l.rect(M + 2, top + 0.4, 4.2, 4.2, { r: 1, fill: ACCENT });
      l.line(M + 3.1, top + 2.5, M + 3.9, top + 3.3, WHITE, 0.55);
      l.line(M + 3.9, top + 3.3, M + 5.3, top + 1.5, WHITE, 0.55);
    } else {
      l.rect(M + 2, top + 0.4, 4.2, 4.2, { r: 1, stroke: [150, 154, 166], lw: 0.3 });
    }
    lines.forEach((line, i) =>
      l.text(line, textX, top + i * advance + (advance - 10 * PT) / 2, {
        size: 10,
        color: on ? MUTED : INK,
      })
    );
    l.y += height;
    l.hair();
  });
  l.y += 8;
  l.flow(
    "Cada uma destas respostas pode mudar o orçamento em dezenas de euros por mês. Vale a pena levar esta folha à visita.",
    { size: 9, color: MUTED, leading: 1.5 }
  );
  return CHECKS.length;
}

/* ---------------------------------------------------------------- document */

export function buildExportDoc(
  source: ExportSource,
  options: ExportOptions,
  checked: boolean[] = []
): ExportDoc {
  const { values: v, mode } = source;
  const c = compute(v, mode);
  const [shortSide, longSide] = options.paper === "letter" ? [215.9, 279.4] : [210, 297];
  const l =
    options.orientation === "landscape"
      ? new Layout(longSide, shortSide)
      : new Layout(shortSide, longSide);

  const active = ALL_SECTIONS.filter((key) => options.sections[key]);

  const details: Record<SectionKey, string> = {
    income: money(c.income) + " / mês",
    expenses: money(c.total) + " / mês",
    split: mode === "equal" ? "50 / 50" : "proporcional",
    savings: money(c.annual) + " / ano",
    scenarios: `${c.scenarios.length} cenários`,
    upfront: money(c.upfront),
    checklist: `${checked.filter(Boolean).length} de ${CHECKS.length}`,
  };

  const title =
    options.title.trim() ||
    (active.length === 1 ? SECTION_NAMES[active[0]] : "Simulação de vida a dois");
  const subtitle = `Aveiro  ·  T1 a ${money(v.rent)}  ·  rendimento conjunto de ${money(c.income)}`;

  header(l, title, subtitle);

  const multi = active.length > 1;
  let indexSlots: ReturnType<Layout["slot"]>[] = [];

  // With more than one section the first page is a summary — masthead, totals, allocation, index —
  // and every section then opens on a page of its own. A single section runs on from the masthead.
  if (multi) {
    stats(l, [
      { label: "Entra / mês", value: money(c.income) },
      { label: "Sai / mês", value: money(c.total) },
      { label: "Sobra / mês", value: money(c.left), color: c.left >= 0 ? ACCENT : RED },
      { label: "Poupança / ano", value: money(c.annual), color: c.annual >= 0 ? ACCENT : RED },
    ]);
    if (options.showAllocation) {
      allocation(
        l,
        [
          { name: "Renda", value: v.rent, color: PRINT_COLOR.rent },
          ...GROUPS.map((g) => ({
            name: g.name,
            value: c.groupSums[g.id],
            color: PRINT_COLOR[g.id] || ACCENT,
          })),
          { name: "Sobra", value: Math.max(0, c.left), color: PRINT_COLOR.left },
        ],
        c.income > 0 ? c.income : 1
      );
    }
    indexSlots = contents(l, active.map((key) => ({ name: SECTION_NAMES[key], detail: details[key] })));
  } else {
    l.section = active.length ? SECTION_NAMES[active[0]] : title;
    l.hair(M, RULE);
    l.y += l.W > l.H ? 7 : 10;
  }

  let items = 0;
  active.forEach((key, position) => {
    if (multi) {
      l.startSection(SECTION_NAMES[key]);
      indexSlots[position].text = String(l.page);
      sectionHead(l, SECTION_NAMES[key], details[key]);
    }
    if (key === "income") items += writeIncome(l, v, c);
    else if (key === "expenses") items += writeExpenses(l, v, c);
    else if (key === "split") items += writeSplit(l, v, c, mode);
    else if (key === "savings") items += writeSavings(l, v, c);
    else if (key === "scenarios") items += writeScenarios(l, c);
    else if (key === "upfront") items += writeUpfront(l, v, c);
    else items += writeChecklist(l, checked);
  });
  if (!active.length) empty(l, "Escolham pelo menos uma secção para exportar.");

  l.pages.forEach((ops, index) => {
    if (index) runningHead(ops, l, l.pageSections[index], title);
    const y = l.H - 14;
    ops.push({ kind: "line", x1: M, y1: y, x2: l.right, y2: y, color: HAIR, lw: 0.2 });
    ops.push({
      kind: "text",
      x: M,
      y: y + 5.6,
      text: clean(`Casa a Dois  ·  ${title}`),
      size: 8,
      bold: false,
      color: MUTED,
      align: "left",
      spacing: 0,
    });
    ops.push({
      kind: "text",
      x: l.right,
      y: y + 5.6,
      text: clean(`Página ${index + 1} de ${l.pages.length}`),
      size: 8,
      bold: false,
      color: MUTED,
      align: "right",
      spacing: 0,
    });
  });

  return { width: l.W, height: l.H, pages: l.pages, title, items };
}

export function toPdf(doc: ExportDoc): jsPDF {
  const pdf = new jsPDF({
    orientation: doc.width > doc.height ? "landscape" : "portrait",
    unit: "mm",
    format: [doc.width, doc.height],
    compress: true,
  });
  doc.pages.forEach((ops, index) => {
    if (index) pdf.addPage();
    for (const op of ops) {
      if (op.kind === "text") {
        pdf.setFont("helvetica", op.bold ? "bold" : "normal");
        pdf.setFontSize(op.size);
        pdf.setTextColor(op.color[0], op.color[1], op.color[2]);
        pdf.text(op.text, op.x, op.y, { align: op.align, charSpace: op.spacing });
      } else if (op.kind === "rect") {
        if (op.fill) pdf.setFillColor(op.fill[0], op.fill[1], op.fill[2]);
        if (op.stroke) {
          pdf.setDrawColor(op.stroke[0], op.stroke[1], op.stroke[2]);
          pdf.setLineWidth(op.lw);
        }
        const style = op.fill && op.stroke ? "FD" : op.fill ? "F" : "S";
        if (op.r > 0) pdf.roundedRect(op.x, op.y, op.w, op.h, op.r, op.r, style);
        else pdf.rect(op.x, op.y, op.w, op.h, style);
      } else if (op.kind === "line") {
        pdf.setDrawColor(op.color[0], op.color[1], op.color[2]);
        pdf.setLineWidth(op.lw);
        pdf.line(op.x1, op.y1, op.x2, op.y2);
      } else {
        pdf.setFillColor(op.fill[0], op.fill[1], op.fill[2]);
        pdf.circle(op.x, op.y, op.r, "F");
      }
    }
  });
  return pdf;
}

export const SECTION_LABELS = SECTION_NAMES;
