"use client";

import { useEffect, useState } from "react";

type Props = {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
};

/**
 * Number input that keeps its own text state so the field can be cleared or
 * edited mid-typing without the cursor jumping, while staying in sync with
 * external updates (slider, reset, saved values).
 */
export default function NumField({
  id,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className = "input",
  style,
  ...rest
}: Props) {
  const [raw, setRaw] = useState(() => String(value));

  useEffect(() => {
    setRaw((prev) => (Number(prev) === value ? prev : String(value)));
  }, [value]);

  const commit = (text: string) => {
    let n = Number(text);
    if (!Number.isFinite(n)) n = min;
    if (n < min) n = min;
    if (max !== undefined && n > max) n = max;
    setRaw(String(n));
    onChange(n);
  };

  return (
    <input
      id={id}
      className={className}
      style={style}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={raw}
      onChange={(e) => {
        const text = e.target.value;
        setRaw(text);
        const n = Number(text);
        if (text !== "" && Number.isFinite(n) && n >= min && (max === undefined || n <= max)) {
          onChange(n);
        }
      }}
      onBlur={(e) => commit(e.target.value)}
      {...rest}
    />
  );
}
