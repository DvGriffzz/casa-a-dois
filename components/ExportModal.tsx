"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "./Icon";
import ExportPreview from "./ExportPreview";
import { Segmented } from "./ui";
import { useStore } from "./store";
import {
  ALL_SECTIONS,
  SECTION_LABELS,
  buildExportDoc,
  toPdf,
  type ExportOptions,
  type ExportSections,
  type SectionKey,
} from "@/lib/pdfExport";

const message = (err: unknown) => (err instanceof Error ? err.message : String(err));
const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "simulacao";

const ALL_ON = Object.fromEntries(ALL_SECTIONS.map((k) => [k, true])) as ExportSections;

function CheckRow({
  checked,
  onChange,
  label,
  meta,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  label: string;
  meta?: string;
}) {
  return (
    <label className="ex-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="box">{checked && <Icon name="check" size={11} />}</span>
      <span className="txt">{label}</span>
      {meta && <small>{meta}</small>}
    </label>
  );
}

export default function ExportModal({ onClose }: { onClose: () => void }) {
  const { values, mode, checked } = useStore();

  const [sections, setSections] = useState<ExportSections>(ALL_ON);
  const [title, setTitle] = useState("");
  const [paper, setPaper] = useState<ExportOptions["paper"]>("a4");
  const [orientation, setOrientation] = useState<ExportOptions["orientation"]>("portrait");
  const [showAllocation, setShowAllocation] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "bad"; text: string } | null>(null);

  const built = useMemo(() => {
    try {
      return {
        doc: buildExportDoc(
          { values, mode },
          { title, paper, orientation, sections, showAllocation },
          checked
        ),
        error: "",
      };
    } catch (err) {
      return { doc: null, error: message(err) };
    }
  }, [values, mode, checked, title, paper, orientation, sections, showAllocation]);

  const doc = built.doc;
  const any = ALL_SECTIONS.some((k) => sections[k]);

  useEffect(() => setStatus(null), [doc]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const save = () => {
    if (!doc) return;
    setBusy(true);
    setStatus(null);
    try {
      const date = new Date().toISOString().slice(0, 10);
      toPdf(doc).save(`casa-a-dois-${slug(doc.title)}-${date}.pdf`);
      setStatus({ kind: "ok", text: "PDF transferido." });
    } catch (err) {
      setStatus({ kind: "bad", text: `Não foi possível gerar: ${message(err)}` });
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: SectionKey, on: boolean) => setSections({ ...sections, [key]: on });

  return (
    <div
      className="ex-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section className="ex-modal" role="dialog" aria-modal="true" aria-label="Exportar PDF">
        <header className="ex-head">
          <div>
            <span className="crumb">Exportar</span>
            <h2>Documento PDF</h2>
          </div>
          <button className="btn quiet" onClick={onClose} disabled={busy} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="ex-body">
          <div className="ex-preview">
            <div className="ex-bar">
              <span>Pré-visualização</span>
              <span className="num">
                {doc ? `${doc.pages.length} página${doc.pages.length === 1 ? "" : "s"}` : ""}
              </span>
            </div>
            {doc ? (
              <ExportPreview doc={doc} />
            ) : (
              <div className="sheets">
                <p className="ex-empty">Não foi possível montar o documento: {built.error}</p>
              </div>
            )}
          </div>

          <aside className="ex-options">
            <div className="ex-group">
              <span className="ex-label">Secções</span>
              {ALL_SECTIONS.map((key) => (
                <div key={key} className={"ex-section" + (sections[key] ? " on" : "")}>
                  <CheckRow
                    checked={sections[key]}
                    onChange={(on) => toggle(key, on)}
                    label={SECTION_LABELS[key]}
                  />
                </div>
              ))}
              <div className="ex-row">
                <button
                  className="btn quiet"
                  onClick={() => setSections(ALL_ON)}
                >
                  Tudo
                </button>
                <button
                  className="btn quiet"
                  onClick={() =>
                    setSections(
                      Object.fromEntries(ALL_SECTIONS.map((k) => [k, false])) as ExportSections
                    )
                  }
                >
                  Nada
                </button>
              </div>
            </div>

            <div className="ex-group">
              <span className="ex-label">Página</span>
              <Segmented
                value={paper}
                onChange={setPaper}
                label="Formato"
                options={[
                  { value: "a4" as const, label: "A4" },
                  { value: "letter" as const, label: "Letter" },
                ]}
              />
              <Segmented
                value={orientation}
                onChange={setOrientation}
                label="Orientação"
                options={[
                  { value: "portrait" as const, label: "Vertical" },
                  { value: "landscape" as const, label: "Horizontal" },
                ]}
              />
            </div>

            <div className="ex-group">
              <span className="ex-label">Resumo</span>
              <div className="ex-section on">
                <CheckRow
                  checked={showAllocation}
                  onChange={setShowAllocation}
                  label="Gráfico de distribuição"
                />
              </div>
            </div>

            <div className="ex-group">
              <span className="ex-label">Título do documento</span>
              <input
                className="input ex-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={doc?.title || "Simulação de vida a dois"}
                aria-label="Título do documento"
              />
            </div>
          </aside>
        </div>

        <footer className="ex-foot">
          <span className={"ex-status" + (status ? " " + status.kind : "")}>
            {status
              ? status.text
              : "O ficheiro é gerado no teu navegador — nada é enviado para servidores."}
          </span>
          <div className="ex-actions">
            <button className="btn" onClick={onClose} disabled={busy}>
              Fechar
            </button>
            <button className="btn primary" onClick={save} disabled={busy || !doc || !any}>
              <Icon name="printer" size={14} />
              {busy ? "A gerar…" : "Transferir PDF"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
