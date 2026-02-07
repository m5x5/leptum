import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chat",
  description: "AI chat with Ollama",
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
