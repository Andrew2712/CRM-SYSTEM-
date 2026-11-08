"use client";

/**
 * src/components/assessment/BodyMap.tsx
 *
 * Interactive front/back body-pain-map picker for the assessment wizard.
 * Clicking a zone opens an NRS (0–10) + pain-quality editor for it; zones
 * are coloured by painColor() from src/lib/assessment/regions.ts so the
 * same severity banding is used here and in the dx engine / report text.
 */

import React, { useState } from "react";
import { FRONT_ZONES, BACK_ZONES, ZONE_LABEL, painColor, PAIN_QUALITIES, type BodyZone } from "@/lib/assessment/regions";
import type { ZonePain } from "@/lib/assessment/types";
import { tokens } from "@/components/ui";

interface BodyMapProps {
  zones: Record<string, ZonePain>;
  onChange: (zones: Record<string, ZonePain>) => void;
}

function ZoneShape({ z, fill, selected, onClick }: { z: BodyZone; fill: string; selected: boolean; onClick: () => void }) {
  const common = {
    onClick,
    style: { cursor: "pointer" as const },
    fill,
    fillOpacity: fill === "transparent" ? 1 : 0.85,
    stroke: selected ? tokens.accent : "#C8B8A8",
    strokeWidth: selected ? 2.5 : 1,
  };
  if (z.s === "e") return <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} {...common} />;
  return <rect x={z.x} y={z.y} width={z.w} height={z.h} rx={z.r} {...common} />;
}

function Figure({ title, list, zones, selected, onSelect }: {
  title: string;
  list: BodyZone[];
  zones: Record<string, ZonePain>;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: tokens.textMuted }}>{title}</div>
      <svg viewBox="0 0 200 335" width="100%" style={{ maxWidth: 180, background: tokens.surfaceAlt, borderRadius: 12 }}>
        {list.map((z) => (
          <ZoneShape key={z.id} z={z} fill={painColor(zones[z.id]?.nrs)} selected={selected === z.id} onClick={() => onSelect(z.id)} />
        ))}
      </svg>
    </div>
  );
}

export default function BodyMap({ zones, onChange }: BodyMapProps) {
  const [sel, setSel] = useState<string | null>(null);

  function setZone(id: string, patch: Partial<ZonePain>) {
    const cur: ZonePain = zones[id] || { nrs: 0 };
    const next = { ...cur, ...patch };
    if (!next.nrs) {
      const rest = { ...zones };
      delete rest[id];
      onChange(rest);
    } else {
      onChange({ ...zones, [id]: next });
    }
  }

  const allZones = [...FRONT_ZONES, ...BACK_ZONES];
  const selZone = sel ? allZones.find((z) => z.id === sel) || null : null;
  const selPain = sel ? zones[sel] : undefined;
  const marked = Object.keys(zones).filter((k) => (zones[k]?.nrs ?? 0) > 0);

  return (
    <div>
      <div className="flex flex-wrap gap-6 justify-center">
        <Figure title="Front" list={FRONT_ZONES} zones={zones} selected={sel} onSelect={setSel} />
        <Figure title="Back" list={BACK_ZONES} zones={zones} selected={sel} onSelect={setSel} />
      </div>

      {selZone && (
        <div className="mt-4 p-4 rounded-2xl" style={{ background: tokens.surfaceAlt, border: `1px solid ${tokens.border}` }}>
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm">{selZone.lb}</div>
            <button type="button" className="text-xs font-semibold" style={{ color: tokens.textMuted }}
              onClick={() => { setZone(sel!, { nrs: 0, q: undefined }); setSel(null); }}>
              Clear
            </button>
          </div>
          <div className="mt-2 text-xs font-semibold" style={{ color: tokens.textSecondary }}>Pain here (NRS)</div>
          <div className="mt-1 flex gap-1.5 flex-wrap">
            {Array.from({ length: 11 }, (_, n) => n).map((n) => (
              <button key={n} type="button" onClick={() => setZone(sel!, { nrs: n })}
                className="w-8 h-8 rounded-full text-xs font-bold border"
                style={(selPain?.nrs ?? 0) === n
                  ? { background: tokens.accent, color: "#fff", borderColor: tokens.accent }
                  : { borderColor: tokens.border, color: tokens.textSecondary }}>
                {n}
              </button>
            ))}
          </div>
          {(selPain?.nrs ?? 0) > 0 && (
            <>
              <div className="mt-3 text-xs font-semibold" style={{ color: tokens.textSecondary }}>Pain quality</div>
              <div className="mt-1 flex gap-2 flex-wrap">
                {PAIN_QUALITIES.map((q) => (
                  <button key={q} type="button" onClick={() => setZone(sel!, { q: selPain?.q === q ? undefined : q })}
                    className="px-3 py-1 rounded-full text-xs font-semibold border"
                    style={selPain?.q === q
                      ? { background: tokens.primary, color: "#fff", borderColor: tokens.primary }
                      : { background: tokens.surface, color: tokens.textSecondary, borderColor: tokens.border }}>
                    {q}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {marked.length > 0 && (
        <div className="mt-3 text-xs" style={{ color: tokens.textMuted }}>
          {marked.map((k) => `${ZONE_LABEL[k] || k} ${zones[k].nrs}/10${zones[k].q ? ` (${zones[k].q})` : ""}`).join(" · ")}
        </div>
      )}
    </div>
  );
}
