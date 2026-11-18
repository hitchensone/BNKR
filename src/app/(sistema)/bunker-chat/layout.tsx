import { openAssistantAction } from "./actions";
import { ChatList } from "@/components/chat/chat-list";
import { NewChat } from "@/components/chat/new-chat";
import { listChats } from "@/lib/data/chat";
import { requireSession, todaySP } from "@/lib/data/session";
import { listStaff } from "@/lib/data/work";
import { Icon3D } from "@/components/icon3d";

// Lista de conversas fixa à esquerda; a conversa aberta ocupa o resto.
// No celular, uma coisa de cada vez.
export default async function ChatLayout({ children }: LayoutProps<"/bunker-chat">) {
  const session = await requireSession();
  const [chats, staff, today] = await Promise.all([
    listChats(session.isStaff),
    session.isStaff ? listStaff() : Promise.resolve([]),
    todaySP(),
  ]);
  const others = [...new Map(staff.filter((s) => s.user_id !== session.userId).map((s) => [s.user_id, s])).values()];

  return (
    <div className="flex h-[calc(100dvh-6.75rem)] min-h-[28rem] gap-4 sm:h-[calc(100dvh-7.25rem)] md:h-[calc(100dvh-2.5rem)]">
      <ChatList chats={chats} today={today} isStaff={session.isStaff} actions={
          session.isStaff ? (
            <>
              <form action={openAssistantAction}>
                <button title="Assistente Bunker" aria-label="Conversar com o assistente" className="tile size-10 bg-tint-purple text-lg transition hover:-translate-y-0.5"><Icon3D e="🤖" /></button>
              </form>
              <NewChat staff={others} />
            </>
          ) : undefined
        } />
      {children}
    </div>
  );
}
