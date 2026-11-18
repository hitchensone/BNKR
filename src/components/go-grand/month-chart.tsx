"use client";

import { useState } from "react";
import type { MonthPoint } from "@/lib/go-grand/summary";
import { monthLabel } from "@/lib/go-grand/summary";

// Entradas x saídas por mês. Paleta validada (azul/laranja, CVD ΔE 31).
const COLORS = { entradas: "#3b5bf6", saidas: "#ff5a36" };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Passo "redondo" (1, 2, 2,5 ou 5 × 10ⁿ) para cerca de 4 divisões. */
function niceStep(max: number) {
  const raw = Math.max(max, 1000) / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Retângulo com cantos de 4px só no topo (base reta). */
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, h, w / 2);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function MonthChart({ data, current }: { data: MonthPoint[]; current: string }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 640, H = 240, padL = 48, padR = 8, padT = 12, padB = 28;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const peak = Math.max(...data.flatMap((d) => [d.entradas, d.saidas]));
  const step = niceStep(peak);
  const max = Math.max(step, Math.ceil(peak / step) * step);
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const band = plotW / data.length;
  const barW = Math.min(24, (band - 16) / 2);
  const y = (v: number) => padT + plotH - (v / max) * plotH;
  const h = hover != null ? data[hover] : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-sm">
        <span className="flex items-center gap-2"><span className="size-3 rounded-[4px]" style={{ background: COLORS.entradas }} />Entradas</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded-[4px]" style={{ background: COLORS.saidas }} />Saídas</span>
        <span className="text-xs text-muted">Operacionais, pelo vencimento (sem aportes e retiradas)</span>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img"
          aria-label="Entradas e saídas dos últimos 6 meses" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e1e6f6" strokeWidth={1} />
              <text x={padL - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#8a93b8">
                {t === 0 ? "0" : compact.format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = padL + band * i + band / 2;
            const active = hover === i;
            return (
              <g key={d.month}>
                {active && <rect x={padL + band * i + 4} y={padT} width={band - 8} height={plotH} rx={12} fill="#eef1fb" />}
                <path d={barPath(cx - barW - 1, y(d.entradas), barW, y(0) - y(d.entradas))} fill={COLORS.entradas} />
                <path d={barPath(cx + 1, y(d.saidas), barW, y(0) - y(d.saidas))} fill={COLORS.saidas} />
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={11}
                  fontWeight={d.month === current ? 700 : 500} fill={d.month === current ? "#2a3768" : "#8a93b8"}>
                  {monthLabel(d.month, "short")}
                </text>
                {/* alvo de hover/toque maior que as barras */}
                <rect x={padL + band * i} y={padT} width={band} height={plotH + padB} fill="transparent"
                  onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
              </g>
            );
          })}
        </svg>

        {h && hover != null && (
          <div className="pointer-events-none absolute top-2 z-10 w-52 rounded-2xl bg-raised p-3 text-sm shadow-[0_12px_30px_-10px_rgb(42_55_104/0.35)]"
            style={{ left: `clamp(0px, calc(${((padL + band * hover + band / 2) / W) * 100}% - 6.5rem), calc(100% - 13rem))` }}>
            <p className="mb-1 font-bold">{monthLabel(h.month)}</p>
            <p className="flex justify-between gap-3"><span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px]" style={{ background: COLORS.entradas }} />Entradas</span><span className="font-semibold">{brl.format(h.entradas)}</span></p>
            <p className="flex justify-between gap-3"><span className="flex items-center gap-2"><span className="size-2.5 rounded-[3px]" style={{ background: COLORS.saidas }} />Saídas</span><span className="font-semibold">{brl.format(h.saidas)}</span></p>
            <p className="mt-1 flex justify-between gap-3 border-t border-border pt-1"><span className="text-muted">Saldo</span><span className="font-semibold">{brl.format(h.entradas - h.saidas)}</span></p>
          </div>
        )}
      </div>

      <details className="px-1 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-muted">Ver em tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-xs text-muted">
            <tr><th className="py-1 font-semibold">Mês</th><th className="py-1 text-right font-semibold">Entradas</th><th className="py-1 text-right font-semibold">Saídas</th><th className="py-1 text-right font-semibold">Saldo</th></tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month} className="border-t border-border">
                <td className="py-1">{monthLabel(d.month)}</td>
                <td className="py-1 text-right">{brl.format(d.entradas)}</td>
                <td className="py-1 text-right">{brl.format(d.saidas)}</td>
                <td className="py-1 text-right font-semibold">{brl.format(d.entradas - d.saidas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
