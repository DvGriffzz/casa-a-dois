"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "./Icon";
import { StoreProvider, useStore } from "./store";
import { CHECKS, NAV, NAV_FLAT, euro, pct, type ViewId } from "@/lib/model";

import Overview from "./views/Overview";
import Income from "./views/Income";
import Expenses from "./views/Expenses";
import Split from "./views/Split";
import Savings from "./views/Savings";
import Scenarios from "./views/Scenarios";
import Upfront from "./views/Upfront";
import Checklist from "./views/Checklist";

// jspdf is heavy and only needed once the export is opened — keep it out of the first load.
const ExportModal = dynamic(() => import("./ExportModal"), { ssr: false });

const VIEWS: Record<ViewId, React.ComponentType> = {
  overview: Overview,
  income: Income,
  expenses: Expenses,
  split: Split,
  savings: Savings,
  scenarios: Scenarios,
  upfront: Upfront,
  checklist: Checklist,
};

const isViewId = (s: string): s is ViewId => NAV_FLAT.some((n) => n.id === s);

export default function AppShell() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

function Shell() {
  const { c, checked, reset } = useStore();
  const [view, setView] = useState<ViewId>("overview");
  const [menu, setMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  /* deep-linkable views via the URL hash */
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace("#", "");
      if (isViewId(h)) setView(h);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const go = (id: ViewId) => {
    setView(id);
    setMenu(false);
    if (window.location.hash.replace("#", "") !== id) {
      window.history.replaceState(null, "", `#${id}`);
    }
    document.querySelector(".scroll")?.scrollTo({ top: 0 });
  };

  const meta = NAV_FLAT.find((n) => n.id === view)!;
  const View = VIEWS[view];
  const doneChecks = checked.filter(Boolean).length;

  return (
    <div className="app">
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      {exporting && <ExportModal onClose={() => setExporting(false)} />}

      <aside className={"sidebar" + (menu ? " open" : "")}>
        <div className="brand">
          <div className="brand-mark">
            <Icon name="home" size={16} />
          </div>
          <div className="brand-text">
            <b>Casa a Dois</b>
            <span>Aveiro · simulador</span>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((g) => (
            <div className="nav-group" key={g.group}>
              <div className="nav-label">{g.group}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  className={"nav-item" + (view === it.id ? " active" : "")}
                  onClick={() => go(it.id)}
                  aria-current={view === it.id ? "page" : undefined}
                >
                  <Icon name={it.icon} size={16} />
                  {it.label}
                  {it.id === "checklist" && (
                    <span className="nav-badge">
                      {doneChecks}/{CHECKS.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <div className="balance-card">
            <div className="lab">Sobra mensal</div>
            <div className={"val num " + (c.left >= 0 ? "pos" : "neg")}>{euro(c.left)}</div>
            <div className="sub">
              {c.income > 0 ? `${pct(c.rate)} do rendimento` : "Sem rendimento definido"}
            </div>
          </div>
          <div className="side-actions">
            <button className="btn quiet" onClick={() => setExporting(true)}>
              <Icon name="printer" size={14} />
              PDF
            </button>
            <button
              className="btn quiet"
              onClick={() => {
                if (confirm("Repor todos os valores por defeito?")) reset();
              }}
            >
              <Icon name="reset" size={14} />
              Repor
            </button>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Abrir menu">
            <Icon name="menu" size={18} />
          </button>
          <div key={view}>
            <div className="crumb">{meta.label}</div>
            <h1>{meta.title}</h1>
          </div>
          <div className="topbar-stats">
            <div className="chip">
              <span>Entra</span>
              <b className="num">{euro(c.income)}</b>
            </div>
            <div className="chip">
              <span>Sai</span>
              <b className="num">{euro(c.total)}</b>
            </div>
            <div className="chip">
              <span>Sobra</span>
              <b className={"num " + (c.left >= 0 ? "pos" : "neg")}>{euro(c.left)}</b>
            </div>
          </div>
        </header>

        <div className="scroll">
          {/* keyed by view: remounting replays the staggered entrance in motion.css */}
          <div className="view" key={view}>
            <p className="view-intro">{meta.blurb}</p>
            <View />
          </div>
        </div>
      </div>
    </div>
  );
}
