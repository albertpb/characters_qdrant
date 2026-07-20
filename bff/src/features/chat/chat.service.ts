import { BadGatewayException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ChatMessage } from "./chat.dto";
import type { UploadFile } from "./upload-file";
import { SYSTEM_PROMPT } from "./constants";

type CharacterMatch = {
  image_id: string;
  score: number;
  payload: Record<string, unknown>;
};

type CharacterSearchResponse = { results: CharacterMatch[] };

@Injectable()
export class ChatService {
  constructor(private readonly config: ConfigService) {}

  async chat({
    prompt,
    messages,
    image,
  }: {
    prompt: string;
    messages: ChatMessage[];
    image?: UploadFile;
  }) {
    const matches = image ? await this.searchImage(image) : [];
    const answer = await this.complete(prompt, messages, matches);
    return { answer, matches };
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

  private async complete(prompt: string, messages: ChatMessage[], matches: CharacterMatch[]): Promise<string> {
    const context = matches.length
      ? matches.map((match, index) => `${index + 1}. ${String(match.payload.name ?? "Unknown")} (similarity ${match.score.toFixed(3)}): ${JSON.stringify(match.payload)}`).join("\n")
      : "No matching character was found in the local character index.";
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
            { role: "user", content: `${prompt}\n\nLocal character image-search context:\n${context}` },
          ],
        }),
      },
    );
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const answer = payload.choices?.[0]?.message?.content;
    if (!answer) throw new BadGatewayException("LM Studio returned no chat response.");
    return answer;
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
