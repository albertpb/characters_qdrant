import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: ["http://127.0.0.1:5173", "http://localhost:5173"] });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const chatImagesDirectory = resolve(process.env.CHAT_IMAGE_DIRECTORY || "../data/images/chat");
  mkdirSync(chatImagesDirectory, { recursive: true });
  app.useStaticAssets(dirname(chatImagesDirectory), { prefix: "/images" });
  await app.listen(process.env.PORT || 3000);
}

void bootstrap();
