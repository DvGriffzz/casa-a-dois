# Casa a Dois 🏡

Simulador do custo de viver a dois em Aveiro — rendimentos, despesas por categoria, orçamento mensal, divisão justa dos custos, poupança anual, comparação de rendas, custo de entrada e checklist.

Next.js 15 (App Router) + React 19 + TypeScript. Página 100% estática, sem backend: tudo corre no browser e os valores ficam guardados em `localStorage`.

## Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Publicar na Vercel

**Opção A — via GitHub (recomendado, dá deploy automático a cada push)**

```bash
git init
git add -A
git commit -m "Casa a Dois — simulador"
git branch -M main
git remote add origin git@github.com:UTILIZADOR/casa-a-dois.git
git push -u origin main
```

Depois em [vercel.com/new](https://vercel.com/new): *Import Git Repository* → escolhe o repo → **Deploy**. A Vercel deteta o Next.js sozinha; não é preciso configurar nada.

**Opção B — direto da pasta, sem GitHub**

```bash
npx vercel          # preview
npx vercel --prod   # produção
```

Domínio: em *Project → Settings → Domains* podes mudar para algo como `casa-a-dois.vercel.app`.

## Estrutura

```
app/
  layout.tsx        metadata, viewport, CSS global
  page.tsx          monta o AppShell
  globals.css       design system completo (tokens, shell, primitivos, responsivo, print)
components/
  AppShell.tsx      sidebar + topbar + routing das vistas (hash-based)
  store.tsx         React context: estado, persistencia e calculos derivados
  ui.tsx            primitivos: Card, Stat, Meter, Segmented, Pill, Notice, DataList
  Icon.tsx          set de icones inline (sem dependencias)
  NumField.tsx      input numerico controlado, tolerante a edicao
  views/            uma vista por seccao da navegacao
lib/
  model.ts          categorias, checklist, navegacao, defaults e a funcao `compute`
```

### Onde mexer

| Quero mudar | Ficheiro |
|---|---|
| Cores, espacamentos, tipografia | `app/globals.css` (bloco `:root`) |
| Categorias de despesa, valores por defeito | `lib/model.ts` |
| Itens e grupos da sidebar | `lib/model.ts` → `NAV` |
| Formulas | `lib/model.ts` → `compute()` |
| Conteudo de uma vista | `components/views/<Nome>.tsx` |

Toda a matematica vive numa funcao pura, `compute(values, mode)`. As vistas apenas leem o resultado via `useStore()`.

Cada vista tem URL propria por hash — `/#expenses`, `/#savings` — por isso da para enviar um link direto a uma seccao.

### Tipografia

O CSS usa Inter quando o sistema a tem, caindo para a face nativa do SO. Para a fixar para toda a gente, acrescenta em `app/layout.tsx`:

```ts
import { Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });
// <html lang="pt-PT" className={inter.variable}>
```

e poe `var(--font-sans)` no inicio de `--font` em `globals.css`.

## Notas

- Valores iniciais são ilustrativos, não cotações reais.
- Não inclui inflação, juros, alterações fiscais nem seguros de saúde.
- Os dados nunca saem do browser — não há base de dados nem analytics.
