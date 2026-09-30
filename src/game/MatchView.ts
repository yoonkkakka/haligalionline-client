import { Card, RuleMode } from "./deck";

// Shared shape both SinglePlayerMatch (local simulation) and OnlineMatch
// (driven by server "state" websocket messages) render through, so
// Renderer.ts doesn't need to know which one it's drawing.
export interface PlayerView {
  id: string;
  name: string;
  faceDownCount: number;
  topCard?: Card;
  totalCards: number;
}

export interface MatchView {
  players: PlayerView[];
  currentPlayerId: string | null;
  bellAvailable: boolean;
  finished: boolean;
  winnerId: string | null;
  target: number;
  ruleMode: RuleMode;
}
