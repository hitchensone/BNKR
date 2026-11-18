import type { ThemeId } from "@/lib/theme";
import { Dock } from "./dock";
import { ThemeSync } from "./theme-picker";

export function Shell({
  modules,
  theme,
  children,
}: {
  modules: Parameters<typeof Dock>[0]["modules"];
  theme?: ThemeId;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px] gap-5 p-3 pb-24 sm:p-5 sm:pb-24 md:pb-5 print:block print:p-0">
      {theme && <ThemeSync theme={theme} />}
      <div className="no-print contents">
        <Dock modules={modules} />
      </div>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
