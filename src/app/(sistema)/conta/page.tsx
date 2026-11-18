import { Bridge, Tile, WidgetGroup } from "@/components/ui";
import { requireSession } from "@/lib/data/session";
import { PasswordForm } from "./form";

export default async function AccountPage() {
  const session = await requireSession();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center">
      <WidgetGroup className="w-full">
        <div className="widget flex items-center gap-4 p-3">
          <Tile tint="blue" size="lg">👤</Tile>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Minha conta</p>
            <h1 className="truncate text-xl font-bold">{session.name}</h1>
          </div>
        </div>
        <Bridge align="start" offset="3.5rem" />
        <div className="widget p-5"><PasswordForm /></div>
      </WidgetGroup>
    </div>
  );
}
