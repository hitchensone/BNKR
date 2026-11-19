"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_WALLPAPER, WALLPAPERS, WALLPAPER_STORAGE_KEY, applyWallpaper } from "@/lib/theme";
import { cx } from "./ui";

const CHANGE = "bnkr-fundo";
function subscribe(cb: () => void) {
  window.addEventListener(CHANGE, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(CHANGE, cb);
    window.removeEventListener("storage", cb);
  };
}
function readSaved() {
  try {
    return (localStorage.getItem(WALLPAPER_STORAGE_KEY) || DEFAULT_WALLPAPER).toLowerCase();
  } catch {
    return DEFAULT_WALLPAPER;
  }
}

/** Cor do fundo do sistema. Vale neste aparelho, em todos os temas menos no Dark. */
export function WallpaperPicker() {
  const current = useSyncExternalStore(subscribe, readSaved, () => DEFAULT_WALLPAPER);

  function choose(hex: string) {
    applyWallpaper(hex);
    window.dispatchEvent(new Event(CHANGE));
  }

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Cor do fundo" className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2.5">
        {WALLPAPERS.map((w) => {
          const on = current === w.hex;
          return (
            <button
              key={w.hex}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={w.name}
              title={w.name}
              onClick={() => choose(w.hex)}
              className={cx(
                "relative aspect-square rounded-[0.9rem] transition hover:-translate-y-0.5",
                "shadow-[inset_1.2px_1.4px_1px_-0.5px_rgb(255_255_255/0.7),inset_-1px_-1.2px_1px_-0.5px_rgb(0_0_0/0.18),0_6px_12px_-8px_rgb(0_0_0/0.45)]",
                on && "ring-2 ring-primary ring-offset-2 ring-offset-transparent",
              )}
              style={{ background: w.hex }}
            >
              {on && <span aria-hidden className="absolute inset-0 grid place-items-center text-lg font-bold text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.5)]">✓</span>}
            </button>
          );
        })}
      </div>
      <p className="px-1 text-xs text-muted">Vale neste aparelho, em todos os temas menos no Dark mode (que fica escuro).</p>
    </div>
  );
}
