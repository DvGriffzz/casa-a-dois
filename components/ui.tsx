"use client";

import Icon from "./Icon";
import { clamp } from "@/lib/model";

/* ---------- card ---------- */

export function Card({
  title,
  desc,
  right,
  children,
  tight,
}: {
  title?: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <section className="card">
      {title && (
        <header className="card-head">
          <div>
            <h3>{title}</h3>
            {desc && <p>{desc}</p>}
          </div>
          {right && <div className="right">{right}</div>}
        </header>
      )}
      <div className={"card-body" + (tight ? " tight" : "")}>{children}</div>
    </section>
  );
}

/* ---------- stat tile ---------- */

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "pos" | "neg" | "warn";
}) {
  return (
    <div className="stat">
      <div className="lab">{label}</div>
      <div className={"val" + (tone ? " " + tone : "")}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

/* ---------- meter ---------- */

export function Meter({
  label,
  value,
  ratio,
  tone = "ok",
  left,
  right,
}: {
  label: string;
  value: string;
  ratio: number;
  tone?: "ok" | "warn" | "bad";
  left?: string;
  right?: string;
}) {
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="track">
        <i
          className={tone === "bad" ? "is-bad" : tone === "warn" ? "is-warn" : undefined}
          style={{ width: `${clamp(ratio * 100, 0, 100)}%` }}
        />
      </div>
      {(left || right) && (
        <div className="meter-scale">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- segmented control ---------- */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- pill ---------- */

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: "ok" | "warn" | "bad" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span className={"pill " + tone}>
      {tone !== "neutral" && <i className="dot" style={{ background: "currentColor" }} />}
      {children}
    </span>
  );
}

/* ---------- notice ---------- */

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "amber";
  children: React.ReactNode;
}) {
  return (
    <div className={"notice" + (tone === "neutral" ? "" : " " + tone)}>
      <Icon name="info" size={15} />
      <div>{children}</div>
    </div>
  );
}

/* ---------- definition list ---------- */

export function DataList({ children }: { children: React.ReactNode }) {
  return <ul className="dl">{children}</ul>;
}

export function DataRow({
  label,
  value,
  tone,
  total,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg" | "warn";
  total?: boolean;
}) {
  return (
    <li className={total ? "total" : undefined}>
      <span>{label}</span>
      <b className={"num" + (tone ? " " + tone : "")}>{value}</b>
    </li>
  );
}
