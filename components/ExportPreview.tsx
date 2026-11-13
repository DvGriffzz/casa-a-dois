"use client";

import { memo } from "react";
import { PT, type ExportDoc, type Op, type RGB } from "@/lib/pdfExport";

const css = (color: RGB) => `rgb(${color[0]},${color[1]},${color[2]})`;
const ANCHOR = { left: "start", center: "middle", right: "end" } as const;

function renderOp(op: Op, key: number) {
  if (op.kind === "text")
    return (
      <text
        key={key}
        x={op.x}
        y={op.y}
        fontSize={op.size * PT}
        fontWeight={op.bold ? 700 : 400}
        fill={css(op.color)}
        textAnchor={ANCHOR[op.align]}
        letterSpacing={op.spacing || undefined}
        style={{ whiteSpace: "pre" }}
      >
        {op.text}
      </text>
    );
  if (op.kind === "rect")
    return (
      <rect
        key={key}
        x={op.x}
        y={op.y}
        width={op.w}
        height={op.h}
        rx={op.r || undefined}
        fill={op.fill ? css(op.fill) : "none"}
        stroke={op.stroke ? css(op.stroke) : "none"}
        strokeWidth={op.stroke ? op.lw : undefined}
      />
    );
  if (op.kind === "line")
    return (
      <line
        key={key}
        x1={op.x1}
        y1={op.y1}
        x2={op.x2}
        y2={op.y2}
        stroke={css(op.color)}
        strokeWidth={op.lw}
        strokeLinecap="round"
      />
    );
  return <circle key={key} cx={op.x} cy={op.y} r={op.r} fill={css(op.fill)} />;
}

/** Draws the exact pages that will be written to the PDF, as crisp vector sheets. */
const ExportPreview = memo(function ExportPreview({ doc }: { doc: ExportDoc }) {
  const landscape = doc.width > doc.height;
  return (
    <div className="sheets">
      {doc.pages.map((ops, index) => (
        <figure key={index} className={"sheet" + (landscape ? " landscape" : "")}>
          <svg
            viewBox={`0 0 ${doc.width} ${doc.height}`}
            fontFamily="Helvetica, Arial, sans-serif"
            role="img"
            aria-label={`Página ${index + 1}`}
          >
            {ops.map(renderOp)}
          </svg>
          <figcaption>
            {index + 1} / {doc.pages.length}
          </figcaption>
        </figure>
      ))}
    </div>
  );
});

export default ExportPreview;
