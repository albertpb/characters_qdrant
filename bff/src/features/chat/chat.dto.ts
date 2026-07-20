import { IsIn, IsOptional, IsString } from "class-validator";

export class ChatMessageDto {
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @IsString()
  content!: string;
}

export class ChatRequestDto {
  @IsString()
  prompt!: string;

  @IsOptional()
  @IsString()
  messages?: string;
}

export type ChatMessage = Pick<ChatMessageDto, "role" | "content">;
