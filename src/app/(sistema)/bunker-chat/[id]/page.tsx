import { notFound } from "next/navigation";
import { ChatThread, ThreadHeader } from "@/components/chat/thread";
import { getChannel, listChats, listMessages } from "@/lib/data/chat";
import { requireSession, todaySP } from "@/lib/data/session";

const TINT = { canal: "bg-tint-blue font-bold text-primary", direto: "bg-tint-green", projeto: "bg-tint-purple" } as const;
const isAdmin = (roles: string[]) => roles.some((r) => r === "owner" || r === "admin");

export default async function ChatPage({ params }: PageProps<"/bunker-chat/[id]">) {
  const session = await requireSession();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [channel, chats, messages, today] = await Promise.all([
    getChannel(id),
    listChats(session.isStaff),
    listMessages(id),
    todaySP(),
  ]);
  if (!channel) notFound();
  const summary = chats.find((c) => c.id === id);

  const placeholder = channel.is_assistant
    ? "Pergunte ao assistente"
    : channel.kind === "projeto"
      ? session.isStaff ? `Responder ${summary?.title ?? "o cliente"}` : "Escreva para a equipe da GO Bunker!"
      : channel.kind === "canal" ? `Mensagem em #${channel.name}` : `Mensagem para ${summary?.title ?? "a pessoa"}`;

  return (
    <ChatThread
      key={id}
      channelId={id}
      initialMessages={messages}
      me={{ id: session.userId, name: session.name }}
      today={today}
      placeholder={placeholder}
      assistant={channel.is_assistant ? "auto" : channel.kind === "direto" ? "off" : "mention"}
      header={
        <ThreadHeader
          icon={summary?.icon ?? "💬"}
          tint={channel.is_assistant ? "bg-tint-purple" : TINT[channel.kind]}
          title={summary?.title ?? "Conversa"}
          subtitle={channel.kind === "projeto" && session.isStaff ? `${summary?.subtitle} · o cliente vê esta conversa` : summary?.subtitle}
          href={channel.project_id ? `/go-there/${channel.project_id}` : channel.is_assistant && isAdmin(session.roles) ? "/bunker-chat/treinar" : undefined}
          hrefLabel={channel.is_assistant ? "Treinar" : undefined}
        />
      }
    />
  );
}
