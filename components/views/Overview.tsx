"use client";

import { useStore } from "../store";
import { Card, Meter, Notice, Pill, Stat } from "../ui";
import { GROUPS, LEFT_COLOR, RENT_COLOR, clamp, euro, pct } from "@/lib/model";

export default function Overview() {
  const { values, c } = useStore();
  const base = c.income > 0 ? c.income : 1;

  const parts = [
    { name: "Renda", color: RENT_COLOR, amount: values.rent },
    ...GROUPS.map((g) => ({ name: g.name, color: g.color, amount: c.groupSums[g.id] })),
    { name: "Sobra", color: LEFT_COLOR, amount: Math.max(0, c.left) },
  ];

  return (
    <>
      <div className="grid-4">
        <Stat label="Entra / mês" value={euro(c.income)} sub="Mês normal, sem subsídios" />
        <Stat label="Sai / mês" value={euro(c.total)} sub="Renda + custos de vida" />
        <Stat
          label="Sobra / mês"
          value={euro(c.left)}
          sub={c.income > 0 ? `${pct(c.rate)} do rendimento` : "—"}
          tone={c.left >= 0 ? "pos" : "neg"}
        />
        <Stat
          label="Poupança / ano"
          value={euro(c.annual)}
          sub="Projeção com subsídios"
          tone={c.annual >= 0 ? undefined : "neg"}
        />
      </div>

      <Card
        title="Distribuição do rendimento"
        desc="Para onde vai cada euro que entra num mês normal."
        right={<Pill tone={c.health.tone}>{c.health.label}</Pill>}
      >
        <div className="alloc" role="img" aria-label="Distribuição do rendimento">
          {parts.map((p) => (
            <i
              key={p.name}
              style={{
                background: p.color,
                width: `${clamp((p.amount / base) * 100, 0, 100)}%`,
              }}
            />
          ))}
        </div>
        <div className="legend">
          {parts.map((p) => (
            <span className="legend-item" key={p.name}>
              <i className="dot" style={{ background: p.color }} />
              {p.name}
              <b>{euro(p.amount)}</b>
            </span>
          ))}
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Indicadores de saúde" desc="Os dois rácios que mais pesam na decisão.">
          <Meter
            label="Peso da renda no rendimento"
            value={c.income > 0 ? pct(c.rentShare) : "—"}
            ratio={c.rentShare}
            tone={c.rentShare > 0.4 ? "bad" : c.rentShare > 0.3 ? "warn" : "ok"}
            left="confortável < 30%"
            right="apertado > 40%"
          />
          <Meter
            label="Taxa de poupança"
            value={c.income > 0 ? pct(c.rate) : "—"}
            ratio={c.rate}
            tone={c.rate < 0 ? "bad" : c.rate < 0.1 ? "warn" : "ok"}
            left="mínimo 10%"
            right="ótimo > 25%"
          />
        </Card>

        <Card title="Leitura rápida" desc="O que estes números significam na prática.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Notice tone={c.left >= 600 ? "accent" : c.left >= 0 ? "amber" : "amber"}>
              {c.left < 0 ? (
                <>
                  As despesas excedem o rendimento em <strong>{euro(-c.left)}</strong> por mês. Vale
                  a pena baixar a renda ou rever as categorias maiores.
                </>
              ) : (
                <>
                  Sobram <strong>{euro(c.left)}</strong> por mês, o que dá{" "}
                  <strong>{euro(c.left * 12)}</strong> num ano só com os meses normais.
                </>
              )}
            </Notice>
            <Notice>
              Com os subsídios, a média anualizada sobe para{" "}
              <strong>{euro(c.perMonth)}</strong> por mês. Para pagar contas, usem sempre o valor do
              mês normal.
            </Notice>
            <Notice>
              A renda representa <strong>{c.income > 0 ? pct(c.rentShare) : "—"}</strong> do que
              entra. Cada 100 € a menos na renda são <strong>1 200 €</strong> por ano.
            </Notice>
          </div>
        </Card>
      </div>
    </>
  );
}
