import { Widget } from "./ui";

/**
 * Esqueleto mostrado na hora em que um módulo é clicado, enquanto o servidor
 * busca os dados. O Next.js já baixa esta casca antes (prefetch dos links),
 * então a troca de tela é imediata em vez de travar esperando o banco.
 */
export function LoadingScreen({ cards = 6 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <Widget className="flex items-center gap-4 p-3 pr-4">
        <div className="skel size-14 rounded-[var(--radius-tile)]" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="skel h-5 w-40 rounded-full" />
          <div className="skel h-3.5 w-64 max-w-full rounded-full" />
        </div>
      </Widget>
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <li key={i}>
            <Widget className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="skel size-11 rounded-[var(--radius-tile)]" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skel h-3 w-24 rounded-full" />
                  <div className="skel h-4.5 w-40 rounded-full" />
                </div>
              </div>
              <div className="skel h-2.5 w-full rounded-full" />
              <div className="skel h-3 w-32 rounded-full" />
            </Widget>
          </li>
        ))}
      </ul>
    </div>
  );
}
