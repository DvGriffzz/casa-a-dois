"use client";

import NumField from "../NumField";
import { useStore } from "../store";
import { Card, Notice, Pill } from "../ui";
import { GROUPS, clamp, euro, pct } from "@/lib/model";

export default function Expenses() {
  const { values, set, setExpense, c } = useStore();

  const rentTone = c.rentShare > 0.4 ? "bad" : c.rentShare > 0.3 ? "warn" : "ok";

  return (
    <>
      <Card
        title="Renda do T1"
        desc="O maior item do orçamento — arrastem para ver o efeito."
        right={<Pill tone={rentTone}>{c.income > 0 ? pct(c.rentShare) : "—"} do rendimento</Pill>}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div style={{ fontSize: 32, fontWeight: 650, letterSpacing: "-0.04em" }} className="num">
            {euro(values.rent)}
          </div>
          <div style={{ marginLeft: "auto", width: 128 }}>
            <NumField
              className="input"
              value={values.rent}
              onChange={(v) => set("rent", v)}
              max={5000}
              step={25}
              aria-label="Renda mensal"
            />
          </div>
        </div>
        <input
          className="slider"
          type="range"
          min={400}
          max={1500}
          step={25}
          value={clamp(values.rent, 400, 1500)}
          onChange={(e) => set("rent", Number(e.target.value))}
          aria-label="Renda mensal"
        />
        <div className="scale">
          <span>400 €</span>
          <span>950 €</span>
          <span>1 500 €</span>
        </div>
        <div style={{ marginTop: 18 }}>
          <Notice tone="amber">
            Intervalo de referência: <strong>750–850 €</strong>. Acima de{" "}
            <strong>900–1 000 €</strong> compensa comparar também T2. Valores orientativos, não uma
            cotação de mercado.
          </Notice>
        </div>
      </Card>

      <Card
        title="Custos recorrentes"
        desc="Cinco categorias, com o subtotal e o peso de cada uma no total."
        right={
          <span className="num" style={{ fontSize: 15, fontWeight: 600 }}>
            {euro(c.total)}
            <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
              {" "}
              / mês
            </span>
          </span>
        }
        tight
      >
        {GROUPS.map((g) => (
          <div className="cat" key={g.id}>
            <div className="cat-head">
              <i className="dot" style={{ background: g.color }} />
              <h4>{g.name}</h4>
              <span className="amt">{euro(c.groupSums[g.id])}</span>
              <span className="share">
                {c.total > 0 ? Math.round((c.groupSums[g.id] / c.total) * 100) + "%" : "—"}
              </span>
            </div>
            <div className="cat-rows">
              {g.items.map((it) => (
                <div className="row" key={it.id}>
                  <label htmlFor={it.id}>{it.label}</label>
                  <span className="pc">
                    {c.total > 0
                      ? Math.round(((values.expenses[it.id] || 0) / c.total) * 100) + "%"
                      : "—"}
                  </span>
                  <NumField
                    id={it.id}
                    className="input"
                    value={values.expenses[it.id] ?? 0}
                    onChange={(v) => setExpense(it.id, v)}
                    max={10000}
                    step={5}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
