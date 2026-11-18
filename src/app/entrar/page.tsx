import { Bridge, Tile, WidgetGroup } from "@/components/ui";
import { SignInForm } from "./form";

// Lê searchParams a cada acesso.
export const instant = false;

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { voltar } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <WidgetGroup className="w-full max-w-sm">
        <div className="widget flex items-center gap-4 p-3">
          <div className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-b from-[#c8f37a] to-[#7ed957] shadow-[0_10px_20px_-8px_rgb(126_217_87/0.8)]">
            <span className="grid size-9 place-items-center rounded-full bg-raised/90 text-xs font-extrabold text-primary">GO</span>
          </div>
          <div>
            <h1 className="text-xl font-bold">GO Bunker!</h1>
            <p className="text-sm text-muted">Mídia e Tecnologia</p>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget p-5">
          <SignInForm back={typeof voltar === "string" ? voltar : undefined} />
        </div>
        <Bridge align="end" offset="3.5rem" />
        <div className="widget flex items-center gap-3 p-3 pl-4">
          <Tile tint="green" size="sm">🔐</Tile>
          <p className="text-xs text-muted">Acesso restrito à equipe e aos clientes da agência.</p>
        </div>
      </WidgetGroup>
    </main>
  );
}
