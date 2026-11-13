"use client";

import { useStore } from "../store";
import { Card, Meter, Notice } from "../ui";
import { CHECKS, euro } from "@/lib/model";

export default function Checklist() {
  const { checked, toggleCheck, values, c } = useStore();
  const done = checked.filter(Boolean).length;

  return (
    <>
      <Card
        title="Perguntas a fazer"
        desc="Cada uma destas respostas pode mudar o orçamento em dezenas de euros por mês."
        right={
          <span className="num muted" style={{ fontSize: 12.5 }}>
            {done} de {CHECKS.length}
          </span>
        }
      >
        <div style={{ marginBottom: 18 }}>
          <Meter
            label="Progresso"
            value={`${Math.round((done / CHECKS.length) * 100)}%`}
            ratio={done / CHECKS.length}
          />
        </div>
        <div>
          {CHECKS.map((t, i) => (
            <label className="check" key={t}>
              <input
                type="checkbox"
                checked={checked[i] ?? false}
                onChange={(e) => toggleCheck(i, e.target.checked)}
              />
              <span>{t}</span>
            </label>
          ))}
        </div>
      </Card>

      <Notice tone="accent">
        Uma renda 300 € mais baixa representa <strong>3 600 € por ano</strong> — margem para
        imprevistos, férias e um eventual projeto de compra. Ao valor atual de{" "}
        {euro(values.rent)}, a vossa poupança projetada é de {euro(c.annual)}.
      </Notice>
    </>
  );
}
