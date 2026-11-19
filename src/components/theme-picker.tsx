"use client";

import { useEffect, useState, useTransition } from "react";
import { saveTheme } from "@/app/(sistema)/ajustes/actions";
import { THEMES, THEME_STORAGE_KEY, applyTheme, type ThemeId } from "@/lib/theme";
import { cx } from "./ui";

// Miniatura de cada tema: fundo + dois "cards"
const PREVIEW: Record<ThemeId, { bg: string; card: string; line: string; extra?: string }> = {
  padrao: { bg: "var(--wall, #fae04b)", card: "#ffffff", line: "#232a4d" },
  dark: { bg: "#12141b", card: "#1b1e29", line: "#eef0f8" },
  glass: { bg: "var(--wall, #fae04b)", card: "rgb(255 255 255 / 0.28)", line: "#232a4d", extra: "inset 0 0 0 1px rgb(255 255 255 / 0.8)" },
  "glass-ish": { bg: "var(--wall, #fae04b)", card: "rgb(255 255 255 / 0.6)", line: "#232a4d", extra: "inset 0 0 0 1px rgb(255 255 255 / 0.5)" },
  liquid: { bg: "var(--wall, #fae04b)", card: "rgb(255 255 255 / 0.16)", line: "#232a4d", extra: "inset 2px 2px 2px rgb(255 255 255 / 0.9), inset -1px -1px 1px rgb(255 255 255 / 0.5)" },
};

export function ThemePicker({ saved }: { saved: ThemeId }) {
  const [current, setCurrent] = useState<ThemeId>(saved);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function choose(id: ThemeId) {
    setCurrent(id);
    applyTheme(id);
    setMsg(null);
    start(async () => {
      const res = await saveTheme(id);
      setMsg(res.error ?? "Tema salvo na sua conta.");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {THEMES.map((t) => {
          const p = PREVIEW[t.id];
          const on = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(t.id)}
              className={cx("flex flex-col gap-2 rounded-[1.25rem] p-2 text-left transition hover:bg-tile/70", on && "bg-tile ring-2 ring-primary")}
            >
              <span
                aria-hidden
                className="relative block h-20 overflow-hidden rounded-[0.9rem]"
                style={{
                  background: t.id === "padrao" || t.id === "dark" ? p.bg
                    : `radial-gradient(60% 70% at 20% 25%, #fff 0%, transparent 60%), radial-gradient(50% 60% at 85% 20%, color-mix(in oklab, ${p.bg}, black 18%) 0%, transparent 65%), ${p.bg}`,
                }}
              >
                <span className="absolute left-2.5 top-2.5 h-8 w-[55%] rounded-lg" style={{ background: p.card, boxShadow: p.extra, backdropFilter: "blur(6px)" }}>
                  <span className="absolute left-2 top-2 h-1.5 w-8 rounded-full opacity-80" style={{ background: p.line }} />
                  <span className="absolute left-2 top-4.5 h-1 w-5 rounded-full opacity-40" style={{ background: p.line }} />
                </span>
                <span className="absolute bottom-2.5 right-2.5 h-7 w-[45%] rounded-lg" style={{ background: p.card, boxShadow: p.extra, backdropFilter: "blur(6px)" }}>
                  <span className="absolute right-2 top-2 h-3 w-6 rounded-md bg-[#3b5bf6]" />
                </span>
              </span>
              <span className="px-1">
                <span className="block text-sm font-semibold">{t.name}</span>
                <span className="block text-xs text-muted">{t.description}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-xs text-muted" role="status">
        {pending ? "Salvando..." : msg ?? "O tema vale em qualquer aparelho em que você entrar. O Liquid Glass tem refração no Chrome e no Edge; nos outros navegadores, vira vidro comum."}
      </p>
    </div>
  );
}

/** Garante que o tema da conta vale neste aparelho (ex.: escolhido em outro computador). */
export function ThemeSync({ theme }: { theme: ThemeId }) {
  useEffect(() => {
    let local: string | null = null;
    try {
      local = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // sem armazenamento: aplica direto
    }
    if (local !== theme) applyTheme(theme);
  }, [theme]);
  return null;
}
