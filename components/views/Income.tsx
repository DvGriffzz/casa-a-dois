"use client";

import NumField from "../NumField";
import { useStore } from "../store";
import { Card, DataList, DataRow, Notice } from "../ui";
import { clamp, euro } from "@/lib/model";

export default function Income() {
  const { values, set, c } = useStore();

  return (
    <>
      <div className="grid-2">
        <Card title="O meu rendimento" desc="Setor do software">
          <div className="field">
            <label htmlFor="mine">Líquido por pagamento</label>
            <NumField
              id="mine"
              className="input"
              value={values.mine}
              onChange={(v) => set("mine", v)}
              max={20000}
              step={50}
            />
          </div>
          <div
            className="field"
            style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <NumField
              className="input sm"
              value={values.mineN}
              onChange={(v) => set("mineN", clamp(v, 12, 14))}
              min={12}
              max={14}
              aria-label="Pagamentos por ano (eu)"
            />
            <span className="lab-sm">pagamentos por ano</span>
          </div>
        </Card>

        <Card title="O rendimento dela" desc="Função pública · civil">
          <div className="field">
            <label htmlFor="hers">Líquido por pagamento</label>
            <NumField
              id="hers"
              className="input"
              value={values.hers}
              onChange={(v) => set("hers", v)}
              max={20000}
              step={50}
            />
          </div>
          <div
            className="field"
            style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <NumField
              className="input sm"
              value={values.hersN}
              onChange={(v) => set("hersN", clamp(v, 12, 14))}
              min={12}
              max={14}
              aria-label="Pagamentos por ano (ela)"
            />
            <span className="lab-sm">pagamentos por ano</span>
          </div>
        </Card>
      </div>

      <Card title="Resumo" desc="O que entra em conjunto.">
        <DataList>
          <DataRow label="Rendimento conjunto (mês normal)" value={euro(c.income)} />
          <DataRow label="Diferença entre os dois" value={euro(Math.abs(values.mine - values.hers))} />
          <DataRow label="Rendimento líquido anual" value={euro(c.yearIncome)} total />
        </DataList>
        <div style={{ marginTop: 16 }}>
          <Notice>
            Confirmem se o <strong>subsídio de alimentação</strong> já está incluído nestes
            líquidos — é uma das diferenças mais comuns entre o valor do recibo e o que entra
            efetivamente na conta.
          </Notice>
        </div>
      </Card>
    </>
  );
}
