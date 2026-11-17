import { ComingSoon } from "@/components/coming-soon";
import { MODULES } from "@/lib/modules";

export default function Page() {
  return <ComingSoon module={MODULES.find((m) => m.id === "go-there")!} />;
}
