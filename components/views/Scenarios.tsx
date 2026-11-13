"use client";

import { useStore } from "../store";
import { Card, Notice } from "../ui";
import { euro, pct } from "@/lib/model";

export default function Scenarios() {
  const { c } = useStore();

  const best = c.scenarios[0];
  const current = c.scenarios.find((s) => s.current);
  const delta = current && best ? current.annual - best.annual : 0;

  return (
    <>
      <Card title="Matriz de rendas" desc="Todas as outras variáveis mantidas constantes." tight>
        <table className="tbl">
          <thead>
            <tr>
              <th>Renda</th>
              <th>Sobra / mês</th>
              <th>Poupança / ano</th>
              <th>% do rendimento</th>
            </tr>
          </thead>
          <tbody>
            {c.scenarios.map((s) => (
              <tr key={s.rent} className={s.current ? "current" : undefined}>
                <td>
                  {euro(s.rent)}
                  {s.current && <span className="tag-now">atual</span>}
                </td>
                <td className={s.left < 0 ? "neg" : "pos"}>{euro(s.left)}</td>
                <td className={s.annual < 0 ? "neg" : undefined}>{euro(s.annual)}</td>
                <td className={s.share > 0.4 ? "neg" : s.share > 0.3 ? "warn" : undefined}>
                  {c.income > 0 ? pct(s.share) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Notice tone="accent">
        Entre a renda mais baixa da tabela e a atual há uma diferença de{" "}
        <strong>{euro(Math.abs(delta))}</strong> por ano. É a margem que separa uma mudança
        confortável de uma apertada — e normalmente vale mais do que cortar em supermercado ou
        lazer.
      </Notice>
    </>
  );
}
