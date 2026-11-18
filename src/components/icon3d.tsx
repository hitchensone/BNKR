import { icon3dKey } from "@/lib/icons3d";

/**
 * Mostra o emoji como ícone 3D quando existe a versão 3D; senão, o
 * próprio caractere. Decorativo: o texto ao lado é que dá o sentido.
 */
export function Icon3D({ e, className, title }: { e: string; className?: string; title?: string }) {
  const key = icon3dKey(e);
  if (!key) return <span aria-hidden={title ? undefined : true} title={title} className={className}>{e}</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/3d/${key}.webp`}
      alt={title ?? ""}
      title={title}
      aria-hidden={title ? undefined : true}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={`icon3d${className ? ` ${className}` : ""}`}
    />
  );
}
