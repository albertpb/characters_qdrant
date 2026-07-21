import { Controller, Delete, Get, HttpCode, Param, Post } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  list() {
    return this.conversations.list();
  }

  @Post()
  create() {
    return this.conversations.create();
  }

  @Get(":conversationId")
  get(@Param("conversationId") conversationId: string) {
    return this.conversations.get(conversationId);
  }

  @Delete(":conversationId")
  @HttpCode(204)
  delete(@Param("conversationId") conversationId: string) {
    this.conversations.delete(conversationId);
  }
}
