import { getAccessToken } from "./api";
import { RuleMode } from "./game/deck";

const WS_BASE = (import.meta.env.VITE_BACKEND_WS_URL as string) || "ws://localhost:8000";

export interface MatchedResult {
  matchId: string;
  players: string[];
}

/** Joins the matchmaking queue and resolves once matched (or rejects on close/error). */
export async function joinMatchmaking(
  mode: "2p" | "4p",
  ruleMode: RuleMode,
  betAmount: number,
  onQueued?: () => void
): Promise<MatchedResult> {
  const token = await getAccessToken();
  const url = `${WS_BASE}/ws/matchmaking?token=${encodeURIComponent(token)}&mode=${mode}&rule_mode=${ruleMode}&bet_amount=${betAmount}`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "queued") onQueued?.();
      if (msg.type === "matched") {
        resolve({ matchId: msg.match_id, players: msg.players });
        ws.close();
      }
    };
    ws.onerror = () => reject(new Error("matchmaking connection failed"));
    ws.onclose = (ev) => {
      if (ev.code !== 1000 && ev.code !== 1005) reject(new Error(ev.reason || "matchmaking closed"));
    };
  });
}

export type ServerMatchMessage =
  | { type: "state"; [key: string]: unknown }
  | { type: "ring_result"; correct: boolean; ringer: string; target: number }
  | { type: "match_end"; winner_profile_id: string | null; pot: number }
  | { type: "error"; detail: string };

export class MatchConnection {
  private ws: WebSocket;

  constructor(matchId: string, token: string, onMessage: (msg: ServerMatchMessage) => void) {
    this.ws = new WebSocket(`${WS_BASE}/ws/match/${matchId}?token=${encodeURIComponent(token)}`);
    this.ws.onmessage = (ev) => onMessage(JSON.parse(ev.data));
  }

  flip() {
    this.ws.send(JSON.stringify({ type: "flip" }));
  }

  ring() {
    this.ws.send(JSON.stringify({ type: "ring" }));
  }

  close() {
    this.ws.close();
  }
}

export interface ChatMessage {
  id: number;
  chat_group: number;
  profile_id: string;
  nickname: string;
  message: string;
  created_at: string;
}

export class ChatConnection {
  private ws: WebSocket;

  constructor(token: string, onMessage: (messages: ChatMessage[]) => void) {
    this.ws = new WebSocket(`${WS_BASE}/ws/chat?token=${encodeURIComponent(token)}`);
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "history") onMessage(msg.messages);
      else if (msg.type === "message") onMessage([msg]);
    };
  }

  send(text: string) {
    this.ws.send(JSON.stringify({ message: text }));
  }

  close() {
    this.ws.close();
  }
}
