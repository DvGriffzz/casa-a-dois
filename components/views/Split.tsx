"use client";

import { useStore } from "../store";
import { Card, DataList, DataRow, Notice, Segmented, Stat } from "../ui";
import { euro, pct, type Mode } from "@/lib/model";

export default function Split() {
  const { values, mode, setMode, c } = useStore();

  const mineLeft = values.mine - c.mineShare;
  const herLeft = values.hers - c.herShare;
  const mineQuota = c.total > 0 ? c.mineShare / c.total : 0.5;

  return (
    <>
      <Card
        title="Método de divisão"
        desc="Proporcional ajusta a quota ao peso de cada salário; 50/50 divide ao meio."
        right={
          <Segmented<Mode>
            value={mode}
            onChange={setMode}
            label="Método de divisão"
            options={[
              { value: "proportional", label: "Proporcional" },
              { value: "equal", label: "50 / 50" },
            ]}
          />
        }
      >
        <div className="grid-2">
          <Stat
            label="Eu pago"
            value={euro(c.mineShare)}
            sub={`${pct(mineQuota)} da despesa · ficam ${euro(mineLeft)}`}
            tone={mineLeft >= 0 ? undefined : "neg"}
          />
          <Stat
            label="Ela paga"
            value={euro(c.herShare)}
            sub={`${pct(1 - mineQuota)} da despesa · ficam ${euro(herLeft)}`}
            tone={herLeft >= 0 ? undefined : "neg"}
          />
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Detalhe" desc="Por mês, sobre a despesa conjunta.">
          <DataList>
            <DataRow label="Despesa total do casal" value={euro(c.total)} />
            <DataRow label="Quota minha" value={euro(c.mineShare)} />
            <DataRow label="Quota dela" value={euro(c.herShare)} />
            <DataRow
              label="Dinheiro livre meu"
              value={euro(mineLeft)}
              tone={mineLeft >= 0 ? "pos" : "neg"}
            />
            <DataRow
              label="Dinheiro livre dela"
              value={euro(herLeft)}
              tone={herLeft >= 0 ? "pos" : "neg"}
            />
            <DataRow
              label="Sobra conjunta no fim do mês"
              value={euro(c.left)}
              tone={c.left >= 0 ? "pos" : "neg"}
              total
            />
          </DataList>
        </Card>

        <Card title="Notas" desc="Pressupostos que vale a pena acordar.">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Notice>
              O simulador assume que <strong>todas as despesas inseridas são partilhadas</strong>.
              Gastos estritamente pessoais devem ficar fora da conta conjunta.
            </Notice>
            <Notice>
              No modo proporcional, quem ganha mais paga mais em valor absoluto, mas ambos ficam com
              a mesma percentagem do salário disponível.
            </Notice>
            <Notice tone="accent">
              Uma prática comum: cada um transfere a sua quota para uma{" "}
              <strong>conta conjunta</strong> no início do mês, e tudo o que é casa sai de lá.
            </Notice>
          </div>
        </Card>
      </div>
    </>
  );
}
