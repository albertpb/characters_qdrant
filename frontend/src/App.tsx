import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ArrowPathIcon, CheckIcon, ClipboardDocumentIcon, TrashIcon } from "@heroicons/react/24/outline";

type CharacterResult = {
  image_id: string;
  score: number;
  payload: Record<string, unknown>;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  imagePath?: string;
  matches?: CharacterResult[];
};

type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

type Conversation = ConversationSummary & { messages: Message[] };

export function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>();
  const [sending, setSending] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>();
  const [error, setError] = useState<string>();
  const [copiedMessage, setCopiedMessage] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const response = await fetch("/bff/conversations");
      if (!response.ok) throw new Error("Unable to load chat history.");
      const saved = await response.json() as ConversationSummary[];
      setConversations(saved);
      if (saved[0]) await selectConversation(saved[0].id);
      else await createConversation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load chat history.");
    }
  }

  async function createConversation() {
    const response = await fetch("/bff/conversations", { method: "POST" });
    if (!response.ok) throw new Error("Unable to create a new chat.");
    const conversation = await response.json() as Conversation;
    setConversations((current) => [conversation, ...current]);
    setConversationId(conversation.id);
    setMessages([]);
  }

  async function selectConversation(id: string) {
    const response = await fetch(`/bff/conversations/${id}`);
    if (!response.ok) throw new Error("Unable to load the selected chat.");
    const conversation = await response.json() as Conversation;
    setConversationId(conversation.id);
    setMessages(conversation.messages.map((message) => ({
      ...message,
      imageUrl: message.imagePath ? `/bff/images/${message.imagePath}` : undefined,
    })));
  }

  async function deleteConversation(id: string) {
    if (sending || !window.confirm("Delete this chat and all of its messages?")) return;
    try {
      const response = await fetch(`/bff/conversations/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete the chat.");
      const remaining = conversations.filter((conversation) => conversation.id !== id);
      setConversations(remaining);
      if (conversationId !== id) return;
      if (remaining[0]) await selectConversation(remaining[0].id);
      else await createConversation();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete the chat.");
    }
  }

  async function copyResponse(messageId: string, content: string) {
    await navigator.clipboard.writeText(content);
    setCopiedMessage(messageId);
    window.setTimeout(() => setCopiedMessage(undefined), 1500);
  }

  async function regenerateResponse(messageId: string) {
    const lastAssistantIndex = messages.map((message) => message.role).lastIndexOf("assistant");
    if (sending || !conversationId || lastAssistantIndex < 0 || messages[lastAssistantIndex]?.id !== messageId) return;
    setSending(true);
    setLoadingStage("Regenerating response...");
    setError(undefined);
    setMessages((current) => current.filter((message) => message.id !== messageId));
    try {
      const response = await fetch("/bff/chat/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!response.ok) throw new Error((await response.json()).message || "Unable to regenerate response.");
      const completion = await response.json();
      setMessages((current) => [
        ...current.slice(0, -1),
        {
          id: completion.message?.id,
          role: "assistant",
          content: completion.answer,
          matches: completion.matches,
        },
      ]);
      await selectConversation(conversationId);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to regenerate response.");
    } finally {
      setSending(false);
      setLoadingStage(undefined);
    }
  }

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : undefined);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!prompt.trim() && !image) || sending || !conversationId) return;

    const userMessage: Message = {
      role: "user",
      content: prompt.trim() || "Identify this character.",
      imageUrl: imagePreview,
    };
    setMessages((current) => [...current, userMessage]);
    setSending(true);
    setLoadingStage(image ? "Searching the character index..." : "Generating response...");
    setError(undefined);
    setPrompt("");

    try {
      const form = new FormData();
      form.append("conversationId", conversationId);
      form.append("prompt", userMessage.content);
      if (image) form.append("image", image);
      const completionResponse = await fetch("/bff/chat", {
        method: "POST",
        body: form,
      });
      if (!completionResponse.ok) throw new Error((await completionResponse.json()).message || "Chat request failed.");
      const completion = await completionResponse.json();
      const answer = completion.answer;
      if (!answer) throw new Error("LM Studio returned no chat response.");
      setMessages((current) => [
        ...current,
        {
          id: completion.message?.id,
          role: "assistant",
          content: answer,
          matches: completion.matches,
        },
      ]);
      const title = userMessage.content.replace(/\s+/g, " ").slice(0, 60) || "New chat";
      setConversations((current) => current.map((conversation) => conversation.id === conversationId ? { ...conversation, title, updatedAt: new Date().toISOString() } : conversation));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The request failed.");
    } finally {
      setSending(false);
      setLoadingStage(undefined);
      setImage(null);
      setImagePreview(undefined);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[#0a0c10] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 sm:px-8">
        <aside className="hidden w-60 shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-3 md:flex">
          <button className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-left text-sm font-medium text-cyan-100 hover:bg-cyan-400/20" type="button" onClick={() => void createConversation()}>+ New chat</button>
          <div className="space-y-1 overflow-y-auto">
            {conversations.map((conversation) => <div key={conversation.id} className={`group flex items-center rounded-lg ${conversation.id === conversationId ? "bg-white/10" : "hover:bg-white/5"}`}><button className={`min-w-0 flex-1 truncate px-3 py-2 text-left text-sm ${conversation.id === conversationId ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`} type="button" onClick={() => void selectConversation(conversation.id)}>{conversation.title}</button><button className="mr-1 rounded p-1 text-slate-500 opacity-0 hover:bg-rose-400/15 hover:text-rose-300 group-hover:opacity-100" type="button" onClick={() => void deleteConversation(conversation.id)} aria-label={`Delete ${conversation.title}`}><TrashIcon className="size-4" /></button></div>)}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
        <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300">CHARACTER INDEX</p>
            <h1 className="mt-1 text-2xl font-semibold">Vision-assisted chat</h1>
          </div>
          <div className="flex items-center gap-2"><button className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 md:hidden" type="button" onClick={() => void createConversation()}>New</button><span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Local stack</span></div>
        </header>

        <section className="flex-1 space-y-5 pb-8">
          {messages.length === 0 && !sending && <p className="pt-20 text-center text-sm text-slate-500">Drop in a character image and ask anything.</p>}
          {messages.map((message, index) => {
            const messageId = message.id || `${message.role}-${index}`;
            return (
            <article key={messageId} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`relative max-w-[88%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-cyan-500 text-slate-950" : "border border-white/10 bg-white/5"}`}>
                {message.imageUrl && <img className="mb-3 max-h-64 rounded-xl object-cover" src={message.imageUrl} alt="Uploaded search" />}
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                {message.role === "assistant" && <div className="mt-3 flex items-center gap-1"><button className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-cyan-200" type="button" onClick={() => void copyResponse(messageId, message.content)} aria-label="Copy response">{copiedMessage === messageId ? <CheckIcon className="size-4" /> : <ClipboardDocumentIcon className="size-4" />}{copiedMessage === messageId ? "Copied" : "Copy"}</button>{index === messages.map((item) => item.role).lastIndexOf("assistant") && <button className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-slate-500 hover:bg-white/5 hover:text-cyan-200 disabled:opacity-40" type="button" disabled={sending} onClick={() => void regenerateResponse(messageId)} aria-label="Regenerate response"><ArrowPathIcon className="size-4" />Regenerate</button>}</div>}
                {message.matches && message.matches.length > 0 && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">Image matches</p>
                    <div className="space-y-1 text-xs text-slate-300">
                      {message.matches.map((match) => <p key={match.image_id}>{String(match.payload.name ?? "Unknown")} <span className="text-slate-500">{match.score.toFixed(3)}</span></p>)}
                    </div>
                  </div>
                )}
              </div>
            </article>
            );
          })}
          {sending && (
            <article className="flex justify-start gap-3">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" />
                </span>
                <span>{loadingStage}</span>
              </div>
            </article>
          )}
        </section>

        <form onSubmit={submit} className="sticky bottom-4 rounded-2xl border border-white/10 bg-[#12161d]/95 p-3 shadow-2xl backdrop-blur">
          {imagePreview && <div className="mb-3 flex items-center gap-3"><img className="h-16 w-16 rounded-lg object-cover" src={imagePreview} alt="Selected upload" /><button className="text-xs text-slate-400 hover:text-white" type="button" onClick={() => { setImage(null); setImagePreview(undefined); if (fileInput.current) fileInput.current.value = ""; }}>Remove image</button></div>}
          <div className="flex items-end gap-2">
            <input ref={fileInput} className="hidden" type="file" accept="image/*" onChange={selectImage} />
            <button className="rounded-xl border border-white/10 px-3 py-2 text-lg text-cyan-300 hover:bg-white/5 cursor-pointer" type="button" onClick={() => fileInput.current?.click()} aria-label="Attach image">+</button>
            <textarea className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-500" rows={1} value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={submitOnEnter} placeholder="Ask about a character, or attach an image..." />
            <button className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer" disabled={sending || (!prompt.trim() && !image)}>{sending ? "Searching..." : "Send"}</button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </form>
        </div>
      </div>
    </main>
  );
}
