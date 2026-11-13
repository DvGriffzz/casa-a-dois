"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CHECKS, DEFAULTS, compute, type Computed, type Mode, type Values } from "@/lib/model";

const KEY = "casa-aveiro-v3";

type Store = {
  values: Values;
  mode: Mode;
  checked: boolean[];
  c: Computed;
  ready: boolean;
  set: <K extends keyof Values>(key: K, v: Values[K]) => void;
  setExpense: (id: string, v: number) => void;
  setMode: (m: Mode) => void;
  toggleCheck: (i: number, v: boolean) => void;
  reset: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [values, setValues] = useState<Values>(DEFAULTS);
  const [mode, setMode] = useState<Mode>("proportional");
  const [checked, setChecked] = useState<boolean[]>(() => CHECKS.map(() => false));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<{
          values: Values;
          mode: Mode;
          checked: boolean[];
        }>;
        if (saved.values) {
          setValues({
            ...DEFAULTS,
            ...saved.values,
            expenses: { ...DEFAULTS.expenses, ...(saved.values.expenses || {}) },
          });
        }
        if (saved.mode === "equal" || saved.mode === "proportional") setMode(saved.mode);
        if (Array.isArray(saved.checked)) setChecked(CHECKS.map((_, i) => !!saved.checked![i]));
      }
    } catch {
      /* storage unavailable or corrupt — carry on with defaults */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ values, mode, checked }));
    } catch {
      /* quota or private mode */
    }
  }, [values, mode, checked, ready]);

  const set = useCallback(<K extends keyof Values>(key: K, v: Values[K]) => {
    setValues((p) => ({ ...p, [key]: v }));
  }, []);

  const setExpense = useCallback((id: string, v: number) => {
    setValues((p) => ({ ...p, expenses: { ...p.expenses, [id]: v } }));
  }, []);

  const toggleCheck = useCallback((i: number, v: boolean) => {
    setChecked((p) => p.map((x, j) => (j === i ? v : x)));
  }, []);

  const reset = useCallback(() => {
    setValues(DEFAULTS);
    setMode("proportional");
    setChecked(CHECKS.map(() => false));
  }, []);

  const c = useMemo(() => compute(values, mode), [values, mode]);

  const store = useMemo<Store>(
    () => ({ values, mode, checked, c, ready, set, setExpense, setMode, toggleCheck, reset }),
    [values, mode, checked, c, ready, set, setExpense, toggleCheck, reset]
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside <StoreProvider>");
  return v;
}
