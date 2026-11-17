import type { CSSProperties, ReactNode } from "react";

// Peças visuais do sistema. Ver os tokens em app/globals.css.

type Tint = "red" | "yellow" | "green" | "blue" | "purple" | "orange";

const tintClass: Record<Tint, string> = {
  red: "bg-tint-red",
  yellow: "bg-tint-yellow",
  green: "bg-tint-green",
  blue: "bg-tint-blue",
  purple: "bg-tint-purple",
  orange: "bg-tint-orange",
};

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/** Card branco arredondado. */
export function Widget({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx("widget", className)}>{children}</div>;
}

/** Agrupa widgets ligados por pontes. A sombra passa a ser do conjunto. */
export function WidgetGroup({
  row,
  className,
  children,
}: {
  row?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <div className={cx("widget-group", row && "row", className)}>{children}</div>;
}

/** Ponte com cantos côncavos entre dois widgets do mesmo grupo. */
export function Bridge({
  align = "center",
  size,
  offset,
}: {
  align?: "start" | "center" | "end";
  size?: string;
  offset?: string;
}) {
  const style = {
    "--bridge-align": align === "center" ? "center" : `flex-${align}`,
    ...(size && { "--bridge-size": size }),
    ...(offset && (align === "end" ? { marginRight: offset } : { marginLeft: offset })),
  } as unknown as CSSProperties;
  return <div aria-hidden className="bridge" style={style} />;
}

/** Bloco de ícone pastel. */
export function Tile({
  tint,
  size = "md",
  className,
  children,
}: {
  tint?: Tint;
  size?: "sm" | "md" | "lg";
  className?: string;
  children: ReactNode;
}) {
  const sizes = { sm: "size-9 text-base", md: "size-12 text-xl", lg: "size-16 text-3xl" };
  return <div className={cx("tile", sizes[size], tint && tintClass[tint], className)}>{children}</div>;
}

/** Número com rótulo, no estilo dos indicadores da referência. */
export function Stat({ icon, tint, value, label }: { icon: string; tint: Tint; value: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Tile tint={tint} size="md">{icon}</Tile>
      <div className="leading-tight">
        <p className="text-lg font-bold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

export type { Tint };
