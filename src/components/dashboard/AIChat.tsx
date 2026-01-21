import { AgentChat } from "@/components/chat/AgentChat";

export function AIChat() {
  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
      <AgentChat agentSlug="analyst_admin" embedded />
    </div>
  );
}
