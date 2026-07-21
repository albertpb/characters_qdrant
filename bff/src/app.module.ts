import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ChatModule } from "./features/chat/chat.module";
import { ConversationsModule } from "./features/conversations/conversations.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ConversationsModule, ChatModule],
})
export class AppModule {}
