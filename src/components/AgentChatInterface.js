"use client";

export default function AgentChatInterface() {
  return (
    <div className="w-full h-screen max-w-full m-0 p-0 overflow-hidden relative">
      <iframe
        src="https://varun324242-agens.hf.space"
        className="w-full h-[calc(100vh-56px)] sm:h-[calc(100vh-64px)] lg:h-full border-none bg-transparent absolute top-0 left-0 right-0 bottom-0 m-auto min-h-full min-w-full"
        title="AI Agent Interface"
      />
    </div>
  );
}
