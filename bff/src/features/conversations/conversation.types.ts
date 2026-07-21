export type CharacterMatch = {
  image_id: string;
  score: number;
  payload: Record<string, unknown>;
};

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePath?: string;
  matches?: CharacterMatch[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
};

export type ConversationSummary = Omit<Conversation, "messages">;
