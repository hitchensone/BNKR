import { ThemePicker } from "@/components/theme-picker";
import { Tile, Widget } from "@/components/ui";
import { requireSession } from "@/lib/data/session";
import { PasswordForm } from "../conta/form";

export default async function SettingsPage() {
  const session = await requireSession();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Widget className="flex items-center gap-4 p-3 pr-4">
        <Tile tint="orange" size="lg">⚙️</Tile>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted">Aparência do sistema e sua conta.</p>
        </div>
      </Widget>

      <Widget className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <Tile tint="yellow" size="md">🎨</Tile>
          <div>
            <h2 className="font-bold">Tema</h2>
            <p className="text-xs text-muted">Escolha como o sistema aparece para você.</p>
          </div>
        </div>
        <ThemePicker saved={session.theme} />
      </Widget>

      <Widget className="grid gap-5 p-5 md:grid-cols-[1fr_1.2fr]">
        <div className="flex items-center gap-3 self-start">
          <Tile tint="blue" size="md">👤</Tile>
          <div className="min-w-0">
            <h2 className="font-bold">Minha conta</h2>
            <p className="truncate text-sm text-muted">{session.name}</p>
          </div>
        </div>
        <PasswordForm />
      </Widget>
    </div>
  );
}
