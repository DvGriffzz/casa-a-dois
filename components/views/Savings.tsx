"use client";

import NumField from "../NumField";
import { useStore } from "../store";
import { Card, DataList, DataRow, Meter, Notice, Stat } from "../ui";
import { euro } from "@/lib/model";

export default function Savings() {
  const { values, set, c } = useStore();

  const months = values.goal > 0 && c.perMonth > 0 ? values.goal / c.perMonth : 0;
  const reachable = values.goal > 0 && c.perMonth > 0;

  const timeLabel =
    values.goal <= 0
      ? "Define um objetivo"
      : c.perMonth <= 0
        ? "Sem margem para poupar"
        : months <= 12
          ? `Atingido em ${Math.ceil(months)} meses`
          : `Atingido em ${(months / 12).toFixed(1).replace(".", ",")} anos`;

  return (
    <>
      <div className="grid-3">
        <Stat label="Rendimento anual" value={euro(c.yearIncome)} sub="Com subsídios" />
        <Stat label="Despesa anual" value={euro(c.total * 12)} sub="12 meses iguais" />
        <Stat
          label="Saldo projetado"
          value={euro(c.annual)}
          sub={`Média de ${euro(c.perMonth)} / mês`}
          tone={c.annual >= 0 ? "pos" : "neg"}
        />
      </div>

      <div className="split">
        <Card title="Objetivo de poupança" desc="Quanto tempo demora a juntar o valor alvo.">
          <div className="field" style={{ maxWidth: 220 }}>
            <label htmlFor="goal">Valor alvo</label>
            <NumField
              id="goal"
              className="input"
              value={values.goal}
              onChange={(v) => set("goal", v)}
              max={500000}
              step={500}
            />
          </div>
          <div style={{ marginTop: 22 }}>
            <Meter
              label={timeLabel}
              value={reachable ? `${euro(c.perMonth)} / mês` : "—"}
              ratio={reachable ? c.annual / values.goal : 0}
              tone={values.goal > 0 && c.perMonth <= 0 ? "bad" : "ok"}
              left="progresso num ano"
              right={values.goal > 0 ? euro(values.goal) : undefined}
            />
          </div>
        </Card>

        <Card title="Decomposição anual" desc="De onde vem o saldo.">
          <DataList>
            <DataRow label="Rendimento líquido anual" value={euro(c.yearIncome)} />
            <DataRow label="Despesas anuais" value={`− ${euro(c.total * 12)}`} />
            <DataRow
              label="Saldo anual"
              value={euro(c.annual)}
              tone={c.annual >= 0 ? "pos" : "neg"}
              total
            />
          </DataList>
          <div style={{ marginTop: 16 }}>
            <Notice>
              A média anualizada inclui férias e Natal, por isso é superior à sobra de um mês
              normal. Para planear pagamentos, usem o mês normal.
            </Notice>
          </div>
        </Card>
      </div>
    </>
  );
}
