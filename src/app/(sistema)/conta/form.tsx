"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="Nova senha" aria-label="Nova senha" className="field" />
      <input name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Repita a nova senha" aria-label="Repita a nova senha" className="field" />
      <button disabled={pending} className="btn btn-primary">{pending ? "Salvando..." : "Trocar senha"}</button>
      {state?.error && <p role="alert" className="text-sm font-medium text-accent">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm font-medium text-[#3c8a2e]">{state.ok}</p>}
    </form>
  );
}
