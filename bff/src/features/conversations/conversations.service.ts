import { Injectable, NotFoundException, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Database = require("better-sqlite3");
import { randomUUID } from "crypto";
import { mkdirSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import type {
  CharacterMatch,
  Conversation,
  ConversationSummary,
  StoredMessage,
} from "./conversation.types";

type ConversationRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  image_path: string | null;
  matches_json: string | null;
  created_at: string;
};

@Injectable()
export class ConversationsService implements OnModuleDestroy {
  private readonly database: Database.Database;
  private readonly imageDirectory: string;

  constructor(config: ConfigService) {
    const databasePath = config.get<string>("CHAT_DATABASE_PATH") || "data/chat-history.sqlite";
    this.imageDirectory = resolve(config.get<string>("CHAT_IMAGE_DIRECTORY") || "../data/images/chat");
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new Database(databasePath);
    this.database.pragma("journal_mode = WAL");
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        image_path TEXT,
        matches_json TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
        ON messages(conversation_id, created_at);
    `);
    const columns = this.database.prepare("PRAGMA table_info(messages)").all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === "image_path")) {
      this.database.exec("ALTER TABLE messages ADD COLUMN image_path TEXT");
    }
  }

  onModuleDestroy() {
    this.database.close();
  }

  list(): ConversationSummary[] {
    const rows = this.database
      .prepare("SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC")
      .all() as ConversationRow[];
    return rows.map((row) => this.toSummary(row));
  }

  create(title = "New chat"): Conversation {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.database
      .prepare("INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)")
      .run(id, title, now, now);
    return { id, title, createdAt: now, updatedAt: now, messages: [] };
  }

  get(id: string): Conversation {
    const conversation = this.database
      .prepare("SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?")
      .get(id) as ConversationRow | undefined;
    if (!conversation) throw new NotFoundException("Conversation not found.");
    const messages = this.database
      .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
      .all(id) as MessageRow[];
    return { ...this.toSummary(conversation), messages: messages.map((row) => this.toMessage(row)) };
  }

  delete(id: string) {
    const result = this.database.prepare("DELETE FROM conversations WHERE id = ?").run(id);
    if (!result.changes) throw new NotFoundException("Conversation not found.");
    rmSync(resolve(this.imageDirectory, id), { recursive: true, force: true });
  }

  addMessage(
    conversationId: string,
    message: Omit<StoredMessage, "id" | "createdAt">,
  ): StoredMessage {
    this.get(conversationId);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    this.database
      .prepare(`INSERT INTO messages (id, conversation_id, role, content, image_path, matches_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id,
        conversationId,
        message.role,
        message.content,
        message.imagePath || null,
        message.matches ? JSON.stringify(message.matches) : null,
        createdAt,
      );
    this.database
      .prepare("UPDATE conversations SET updated_at = ? WHERE id = ?")
      .run(createdAt, conversationId);
    return { id, createdAt, ...message };
  }

  removeLatestAssistantMessage(conversationId: string) {
    const message = this.database
      .prepare("SELECT id, role FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(conversationId) as { id: string; role: string } | undefined;
    if (!message || message.role !== "assistant") {
      throw new NotFoundException("No assistant response is available to regenerate.");
    }
    this.database.prepare("DELETE FROM messages WHERE id = ?").run(message.id);
  }

  updateTitleFromPrompt(conversationId: string, prompt: string) {
    const current = this.get(conversationId);
    if (current.messages.length > 1 || current.title !== "New chat") return;
    const title = prompt.trim().replace(/\s+/g, " ").slice(0, 60) || "New chat";
    this.database.prepare("UPDATE conversations SET title = ? WHERE id = ?").run(title, conversationId);
  }

  private toSummary(row: ConversationRow): ConversationSummary {
    return {
      id: row.id,
      title: row.title,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private toMessage(row: MessageRow): StoredMessage {
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      imagePath: row.image_path || undefined,
      matches: row.matches_json ? JSON.parse(row.matches_json) as CharacterMatch[] : undefined,
      createdAt: row.created_at,
    };
  }
}
