import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatMessage } from "./chat.dto";
import type { UploadFile } from "./upload-file";
import { SYSTEM_PROMPT } from "./constants";
import { ConversationsService } from "../conversations/conversations.service";
import type { CharacterMatch } from "../conversations/conversation.types";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { randomUUID } from "crypto";
import { extname, resolve } from "path";
import type { StoredMessage } from "../conversations/conversation.types";

type CharacterSearchResponse = { results: CharacterMatch[] };
type LmStudioMessage = {
  role: "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly config: ConfigService,
    private readonly conversations: ConversationsService,
  ) {}

  async chat({
    prompt,
    conversationId,
    image,
  }: {
    prompt: string;
    conversationId: string;
    image?: UploadFile;
  }) {
    const conversation = this.conversations.get(conversationId);
    const messages = this.toLmStudioMessages(conversation.messages);
    const matches = image ? await this.searchImage(image) : [];
    const answer = await this.complete(prompt, messages, matches);
    const imagePath = image ? this.storeImage(conversationId, image) : undefined;
    this.conversations.updateTitleFromPrompt(conversationId, prompt);
    this.conversations.addMessage(conversationId, {
      role: "user",
      content: prompt,
      imagePath,
    });
    const assistantMessage = this.conversations.addMessage(conversationId, {
      role: "assistant",
      content: answer,
      matches,
    });
    return { answer, matches, message: assistantMessage };
  }

  async regenerate(conversationId: string) {
    const conversation = this.conversations.get(conversationId);
    const latestMessage = conversation.messages.at(-1);
    if (!latestMessage || latestMessage.role !== "assistant") {
      throw new BadGatewayException("No assistant response is available to regenerate.");
    }
    this.conversations.removeLatestAssistantMessage(conversationId);
    const priorMessages = conversation.messages.slice(0, -1);
    const lastUserMessage = [...priorMessages].reverse().find((message) => message.role === "user");
    const context = this.characterContext(latestMessage.matches || []);
    const messages = this.toLmStudioMessages(priorMessages);
    if (lastUserMessage) {
      messages.push({
        role: "user",
        content: `${lastUserMessage.content}\n\nLocal character image-search context:\n${context}`,
      });
    }
    const answer = await this.completeFromHistory(messages);
    const assistantMessage = this.conversations.addMessage(conversationId, {
      role: "assistant",
      content: answer,
      matches: latestMessage.matches,
    });
    return { answer, matches: latestMessage.matches || [], message: assistantMessage };
  }

  private async searchImage(image: UploadFile): Promise<CharacterMatch[]> {
    const body = new FormData();
    const bytes = new Uint8Array(image.buffer.byteLength);
    bytes.set(image.buffer);
    body.append("image", new Blob([bytes], { type: image.mimetype }), image.originalname);
    body.append("limit", "5");
    const response = await this.request(
      `${this.config.getOrThrow<string>("CHARACTER_API_URL")}/api/v1/characters/search/image`,
      { method: "POST", body },
    );
    return (await response.json() as CharacterSearchResponse).results;
  }

  private storeImage(conversationId: string, image: UploadFile): string {
    const extension = extname(image.originalname).toLowerCase() || ".bin";
    const directory = resolve(process.env.CHAT_IMAGE_DIRECTORY || "../data/images/chat", conversationId);
    mkdirSync(directory, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    writeFileSync(resolve(directory, filename), image.buffer);
    return `chat/${conversationId}/${filename}`;
  }

  private async complete(prompt: string, messages: LmStudioMessage[], matches: CharacterMatch[]): Promise<string> {
    const context = this.characterContext(matches);
    return this.completeFromHistory([
      ...messages,
      { role: "user", content: `${prompt}\n\nLocal character image-search context:\n${context}` },
    ]);
  }

  private async completeFromHistory(messages: LmStudioMessage[]): Promise<string> {
    const response = await this.request(
      `${this.config.getOrThrow<string>("LM_STUDIO_URL")}/v1/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.config.getOrThrow<string>("LM_STUDIO_MODEL"),
          temperature: 0.5,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
        }),
      },
    );
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = payload.choices?.[0]?.message?.content;
    if (!answer) throw new BadGatewayException("LM Studio returned no chat response.");
    return answer;
  }

  private characterContext(matches: CharacterMatch[]): string {
    return matches.length
      ? matches.map((match, index) => `${index + 1}. ${String(match.payload.name ?? "Unknown")} (similarity ${match.score.toFixed(3)}): ${JSON.stringify(match.payload)}`).join("\n")
      : "No matching character was found in the local character index.";
  }

  private toLmStudioMessages(messages: StoredMessage[]): LmStudioMessage[] {
    return messages.map((message) => {
      if (!message.imagePath) return { role: message.role, content: message.content };
      const imageUrl = this.imageDataUrl(message.imagePath);
      return {
        role: message.role,
        content: [
          { type: "text", text: message.content },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      };
    });
  }

  private imageDataUrl(imagePath: string): string {
    const extension = extname(imagePath).toLowerCase();
    const mediaType = extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : extension === ".gif"
          ? "image/gif"
          : "image/png";
    const path = resolve(process.env.CHAT_IMAGE_DIRECTORY || "../data/images/chat", "..", imagePath);
    return `data:${mediaType};base64,${readFileSync(path).toString("base64")}`;
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        throw new BadGatewayException(`Upstream request failed (${response.status}): ${await response.text()}`);
      }
      return response;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException(`Upstream service is unavailable: ${url}`);
    }
  }
}
