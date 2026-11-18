"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SystemModule } from "@/lib/modules";
import { Icon3D } from "./icon3d";
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

function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" aria-label="Início" className={cx("grid place-items-center rounded-full bg-gradient-to-b from-[#ffd84d] to-[#ff9d2e] shadow-[0_8px_16px_-8px_rgb(255_140_40/0.9)]", className)}>
      <span className="grid size-[62%] place-items-center rounded-full bg-raised/95 text-[10px] font-extrabold tracking-tight text-foreground">GO</span>
    </Link>
  );
}

/** Dock lateral (desktop) e barra inferior (celular) com os módulos. */
export function Dock({ modules }: { modules: DockModule[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const items = (size: string) =>
    modules.map((m) => {
      const active = isActive(m.href);
      return (
        <Link
          key={m.id}
          href={m.href}
          title={m.name}
          aria-label={m.name}
          aria-current={active ? "page" : undefined}
          className={cx("tile text-lg transition hover:-translate-y-0.5", size, active && "ring-2 ring-primary ring-offset-2 ring-offset-surface", tint[m.tint])}
        >
          <Icon3D e={m.icon} />
        </Link>
      );
    });

  return (
    <>
      {/* Desktop: coluna à esquerda, logo ligado aos módulos por uma ponte */}
      <aside className="sticky top-5 hidden h-fit md:block">
        <div className="widget-group">
          <div className="widget rounded-[1.5rem] p-2.5">
            <Logo className="size-11" />
          </div>
          <div className="bridge" style={{ ["--bridge-size" as string]: "1rem", ["--bridge-r" as string]: "6px" }} aria-hidden />
          <nav className="widget flex flex-col items-center gap-2.5 rounded-[1.5rem] p-2.5" aria-label="Módulos">
            {items("size-11")}
            <div className="my-0.5 h-px w-6 bg-border" />
            <form action="/auth/sair" method="post">
              <button title="Sair" aria-label="Sair" className="tile size-11 text-base text-muted hover:text-accent">⏻</button>
            </form>
          </nav>
        </div>
      </aside>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-3 bottom-3 z-20 md:hidden" aria-label="Módulos">
        <div className="widget flex items-center justify-between gap-1 p-2">
          <Logo className="size-10" />
          {items("size-10")}
        </div>
      </nav>
    </>
  );
}
