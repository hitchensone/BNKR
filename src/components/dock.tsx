"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SystemModule } from "@/lib/modules";
import { cx } from "./ui";

const tint: Record<SystemModule["tint"], string> = {
  red: "bg-tint-red",
  yellow: "bg-tint-yellow",
  green: "bg-tint-green",
  blue: "bg-tint-blue",
  purple: "bg-tint-purple",
  orange: "bg-tint-orange",
};

type DockModule = Pick<SystemModule, "id" | "name" | "href" | "icon" | "tint">;

/** Dock lateral (desktop) e barra inferior (celular) com os módulos. */
export function Dock({ modules, initials }: { modules: DockModule[]; initials: string }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const items = modules.map((m) => {
    const active = isActive(m.href);
    return (
      <Link
        key={m.id}
        href={m.href}
        title={m.name}
        aria-label={m.name}
        aria-current={active ? "page" : undefined}
        className={cx(
          "tile size-12 text-xl transition hover:-translate-y-0.5",
          active ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : "",
          tint[m.tint],
        )}
      >
        <span aria-hidden>{m.icon}</span>
      </Link>
    );
  });

  return (
    <>
      {/* Desktop: coluna à esquerda, logo ligado aos módulos por uma ponte */}
      <aside className="sticky top-6 hidden h-fit md:block">
        <div className="widget-group">
          <div className="widget rounded-[1.75rem] p-3">
            <Link href="/" aria-label="Início" className="grid size-14 place-items-center rounded-full bg-gradient-to-b from-[#c8f37a] to-[#7ed957] shadow-[0_10px_20px_-8px_rgb(126_217_87/0.8)]">
              <span className="grid size-8 place-items-center rounded-full bg-white/90 text-[11px] font-extrabold text-primary">GO</span>
            </Link>
          </div>
          <div className="bridge" style={{ ["--bridge-size" as string]: "1.25rem", ["--bridge-r" as string]: "7px" }} aria-hidden />
          <nav className="widget flex flex-col items-center gap-3 rounded-[1.75rem] p-3">
            {items}
            <div className="my-1 h-px w-8 bg-border" />
            <Link href="/conta" title="Minha conta" aria-label="Minha conta" className="tile size-12 bg-tint-blue text-sm font-bold text-primary">{initials}</Link>
            <form action="/auth/sair" method="post">
              <button title="Sair" aria-label="Sair" className="tile size-12 text-lg text-muted hover:text-accent">⏻</button>
            </form>
          </nav>
        </div>
      </aside>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-4 bottom-4 z-20 md:hidden">
        <div className="widget flex items-center justify-around gap-2 p-2.5">
          <Link href="/" aria-label="Início" className="tile size-11 bg-gradient-to-b from-[#c8f37a] to-[#7ed957] text-[10px] font-extrabold text-primary">GO</Link>
          {items}
        </div>
      </nav>
    </>
  );
}
