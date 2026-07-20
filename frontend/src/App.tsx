import { ChangeEvent, FormEvent, useRef, useState } from "react";

type CharacterResult = {
  image_id: string;
  score: number;
  payload: Record<string, unknown>;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  matches?: CharacterResult[];
};

export function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Drop in a character image and ask anything. I will search the local character index before answering.",
    },
  ]);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>();
  const [sending, setSending] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>();
  const [error, setError] = useState<string>();
  const fileInput = useRef<HTMLInputElement>(null);

  function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : undefined);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!prompt.trim() && !image) || sending) return;

    const userMessage: Message = { role: "user", content: prompt.trim() || "Identify this character.", imageUrl: imagePreview };
    setMessages((current) => [...current, userMessage]);
    setSending(true);
    setLoadingStage(image ? "Searching the character index..." : "Generating response...");
    setError(undefined);
    setPrompt("");

    try {
      const form = new FormData();
      form.append("prompt", userMessage.content);
      form.append("messages", JSON.stringify(messages.map(({ role, content }) => ({ role, content }))));
      if (image) form.append("image", image);
      const completionResponse = await fetch("/bff/chat", {
        method: "POST",
        body: form,
      });
      if (!completionResponse.ok) throw new Error((await completionResponse.json()).message || "Chat request failed.");
      const completion = await completionResponse.json();
      const answer = completion.answer;
      if (!answer) throw new Error("LM Studio returned no chat response.");
      setMessages((current) => [...current, { role: "assistant", content: answer, matches: completion.matches }]);
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
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 sm:px-8">
        <header className="mb-8 flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-cyan-300">CHARACTER INDEX</p>
            <h1 className="mt-1 text-2xl font-semibold">Vision-assisted chat</h1>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Local stack</span>
        </header>

        <section className="flex-1 space-y-5 pb-8">
          {messages.map((message, index) => (
            <article key={index} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${message.role === "user" ? "bg-cyan-500 text-slate-950" : "border border-white/10 bg-white/5"}`}>
                {message.imageUrl && <img className="mb-3 max-h-64 rounded-xl object-cover" src={message.imageUrl} alt="Uploaded search" />}
                <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
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
          ))}
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
            <button className="rounded-xl border border-white/10 px-3 py-2 text-lg text-cyan-300 hover:bg-white/5" type="button" onClick={() => fileInput.current?.click()} aria-label="Attach image">+</button>
            <textarea className="min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-500" rows={1} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about a character, or attach an image..." />
            <button className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40" disabled={sending || (!prompt.trim() && !image)}>{sending ? "Searching..." : "Send"}</button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
        </form>
      </div>
    </main>
  );
}
