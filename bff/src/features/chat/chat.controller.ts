import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ChatRequestDto, RegenerateRequestDto } from "./chat.dto";
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
    return this.chatService.chat({
      conversationId: body.conversationId,
      prompt: body.prompt,
      image: image as UploadFile | undefined,
    });
  }

  @Post("regenerate")
  regenerate(@Body() body: RegenerateRequestDto) {
    return this.chatService.regenerate(body.conversationId);
  }
}
