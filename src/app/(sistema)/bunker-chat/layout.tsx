import { openAssistantAction } from "./actions";
import { ChatList } from "@/components/chat/chat-list";
import { NewChat } from "@/components/chat/new-chat";
import { listChats } from "@/lib/data/chat";
import { requireSession, todaySP } from "@/lib/data/session";
import { listStaff } from "@/lib/data/work";

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
    <div className="flex h-[calc(100dvh-8rem)] min-h-[28rem] gap-5 sm:h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-3rem)]">
      <ChatList chats={chats} today={today} isStaff={session.isStaff} actions={
          session.isStaff ? (
            <>
              <form action={openAssistantAction}>
                <button title="Assistente Bunker" aria-label="Conversar com o assistente" className="tile size-11 bg-tint-purple text-lg transition hover:-translate-y-0.5">🤖</button>
              </form>
              <NewChat staff={others} />
            </>
          ) : undefined
        } />
      {children}
    </div>
  );
}
