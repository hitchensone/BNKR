import { MODULES } from "@/lib/modules";

const mod = MODULES.find((m) => m.id === "go-up")!;

export default function Page() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">{mod.name}</h1>
      <p className="mt-1 text-muted">{mod.description}. Módulo em construção.</p>
    </div>
  );
}
