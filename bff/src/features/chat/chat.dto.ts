import { IsIn, IsString } from "class-validator";

export class ChatMessageDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @IsString()
  conversationId!: string;

  @IsString()
  prompt!: string;

}

export class RegenerateRequestDto {
  @IsString()
  conversationId!: string;
}

export type ChatMessage = Pick<ChatMessageDto, "role" | "content">;
