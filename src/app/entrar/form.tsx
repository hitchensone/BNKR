"use client";

import { useActionState } from "react";
import { signIn } from "./actions";

export function SignInForm({ back }: { back?: string }) {
  const [error, action, pending] = useActionState(signIn, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="voltar" value={back ?? "/"} />
      <input name="email" type="email" required placeholder="E-mail" autoComplete="email" className="field" />
      <input name="password" type="password" required placeholder="Senha" autoComplete="current-password" className="field" />
      {error && <p className="text-sm font-medium text-accent">{error}</p>}
      <button disabled={pending} className="btn btn-primary mt-1 w-full">{pending ? "Entrando..." : "Entrar"}</button>
    </form>
  );
}
