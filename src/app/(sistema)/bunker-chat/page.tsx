import { requireSession } from "@/lib/data/session";
import { Icon3D } from "@/components/icon3d";

export default async function ChatHome() {
  const session = await requireSession();
  return (
    <section className="widget hidden flex-1 flex-col items-center justify-center gap-3 p-8 text-center lg:flex">
      <span className="tile size-14 bg-tint-green text-3xl"><Icon3D e="💬" /></span>
      <h2 className="text-xl font-bold">Escolha uma conversa</h2>
      <p className="max-w-sm text-sm text-muted">
        {session.isStaff
          ? "Fale com a equipe no #geral, abra uma conversa direta pelo + ou responda os clientes na conversa de cada projeto."
          : "Aqui você conversa direto com a equipe da GO Bunker! sobre cada projeto."}
      </p>
    </section>
  );
}
