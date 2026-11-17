import { SignInForm } from "./form";

// Sistema autenticado: as telas dependem da sessão, então podem esperar o servidor.
export const instant = false;

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const { voltar } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold">GO Bunker!</h1>
        <p className="mb-6 text-sm text-muted">Entre para acessar o sistema.</p>
        <SignInForm back={typeof voltar === "string" ? voltar : undefined} />
      </div>
    </main>
  );
}
