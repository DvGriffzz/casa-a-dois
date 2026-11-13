"use client";

import NumField from "../NumField";
import { useStore } from "../store";
import { Card, DataList, DataRow, Notice, Stat } from "../ui";
import { clamp, euro } from "@/lib/model";

export default function Upfront() {
  const { values, set, c } = useStore();
  const months = c.perMonth > 0 ? Math.ceil(c.upfront / c.perMonth) : null;

  return (
    <>
      <div className="grid-2">
        <Stat
          label="Total à entrada"
          value={euro(c.upfront)}
          sub="Contrato + instalação"
          tone="warn"
        />
        <Stat
          label="Tempo para juntar"
          value={months !== null ? `${months} meses` : "—"}
          sub={months !== null ? `Ao ritmo de ${euro(c.perMonth)} / mês` : "Sem margem de poupança"}
        />
      </div>

      <Card title="Componentes" desc="Ajustem conforme o que o senhorio pedir.">
        <div className="grid-2">
          <div className="field">
            <label htmlFor="depositN">Meses de caução</label>
            <NumField
              id="depositN"
              className="input"
              value={values.depositN}
              onChange={(v) => set("depositN", clamp(v, 0, 3))}
              max={3}
            />
            <span className="help">Habitualmente 1 a 2 meses de renda.</span>
          </div>
          <div className="field">
            <label htmlFor="advanceN">Rendas adiantadas</label>
            <NumField
              id="advanceN"
              className="input"
              value={values.advanceN}
              onChange={(v) => set("advanceN", clamp(v, 0, 3))}
              max={3}
            />
            <span className="help">Para além da primeira renda.</span>
          </div>
          <div className="field">
            <label htmlFor="furniture">Móveis e equipamento</label>
            <NumField
              id="furniture"
              className="input"
              value={values.furniture}
              onChange={(v) => set("furniture", v)}
              max={30000}
              step={50}
            />
            <span className="help">Zero se a casa vier mobilada.</span>
          </div>
          <div className="field">
            <label htmlFor="moving">Mudanças e instalações</label>
            <NumField
              id="moving"
              className="input"
              value={values.moving}
              onChange={(v) => set("moving", v)}
              max={10000}
              step={50}
            />
            <span className="help">Transporte, internet, contadores.</span>
          </div>
        </div>
      </Card>

      <div className="split">
        <Card title="Soma" desc="O cheque do primeiro dia.">
          <DataList>
            <DataRow
              label={`Primeira renda + ${values.depositN} caução + ${values.advanceN} adiantada(s)`}
              value={euro(c.upRent)}
            />
            <DataRow label="Móveis, equipamento e mudanças" value={euro(c.upOther)} />
            <DataRow label="Total à entrada" value={euro(c.upfront)} total />
          </DataList>
        </Card>

        <Card title="Antes de avançar">
          <Notice tone="amber">
            Deixem o <strong>fundo de emergência</strong> fora desta conta. O ideal é entrar com a
            caução paga e ainda três meses de despesas de reserva — {euro(c.total * 3)} no vosso
            caso.
          </Notice>
        </Card>
      </div>
    </>
  );
}
