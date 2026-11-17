"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function SignInForm({ back }: { back?: string }) {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="voltar" value={back ?? "/"} />
      <input name="email" type="email" required placeholder="E-mail" autoComplete="email"
        className="rounded-lg border border-border bg-surface px-3 py-2" />
      <input name="password" type="password" required placeholder="Senha" autoComplete="current-password"
        className="rounded-lg border border-border bg-surface px-3 py-2" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button disabled={pending} className="rounded-lg bg-accent px-3 py-2 font-medium text-white disabled:opacity-60">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
