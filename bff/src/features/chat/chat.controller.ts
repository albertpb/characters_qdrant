import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ChatRequestDto, type ChatMessage } from "./chat.dto";
import { ChatService } from "./chat.service";
import type { UploadFile } from "./upload-file";

@Controller("chat")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @UseInterceptors(FileInterceptor("image"))
  async chat(
    @Body() body: ChatRequestDto,
    @UploadedFile() image?: unknown,
  ) {
    let messages: ChatMessage[] = [];
    if (body.messages) {
      try {
        messages = JSON.parse(body.messages) as ChatMessage[];
      } catch {
        throw new BadRequestException("messages must be a valid JSON array.");
      }
    }
    return this.chatService.chat({
      prompt: body.prompt,
      messages,
      image: image as UploadFile | undefined,
    });
  }
}
