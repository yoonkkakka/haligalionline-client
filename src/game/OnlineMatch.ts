import { MatchConnection, ServerMatchMessage } from "../network";
import { RuleMode } from "./deck";
import { MatchView } from "./MatchView";

/** Thin wrapper turning the server's authoritative "state" broadcasts into a
 * MatchView, so the same Renderer.renderMatch used for single-player also
 * draws online matches. */
export class OnlineMatch {
  view: MatchView = {
    players: [],
    currentPlayerId: null,
    bellAvailable: false,
    finished: false,
    winnerId: null,
    target: 5,
    ruleMode: "classic" as RuleMode,
  };
  private conn: MatchConnection;
  private listeners: (() => void)[] = [];
  private logListeners: ((text: string) => void)[] = [];

  constructor(matchId: string, token: string, public yourId: string) {
    this.conn = new MatchConnection(matchId, token, (msg) => this.handleMessage(msg));
  }

  onUpdate(cb: () => void) {
    this.listeners.push(cb);
  }

  onLog(cb: (text: string) => void) {
    this.logListeners.push(cb);
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  private log(text: string) {
    for (const l of this.logListeners) l(text);
  }

  private handleMessage(msg: ServerMatchMessage) {
    if (msg.type === "state") {
      const s = msg as any;
      this.view = {
        players: s.players.map((p: any) => ({
          id: p.profile_id,
          name: p.profile_id === this.yourId ? "나" : p.profile_id.slice(0, 6),
          faceDownCount: p.face_down_count,
          topCard: p.top_card ? { fruit: p.top_card.fruit, count: p.top_card.count } : undefined,
          totalCards: p.total_cards,
        })),
        currentPlayerId: s.turn_profile_id,
        bellAvailable: s.bell_available,
        finished: s.finished,
        winnerId: s.winner_profile_id,
        target: s.target,
        ruleMode: s.rule_mode,
      };
      this.emit();
    } else if (msg.type === "ring_result") {
      const who = msg.ringer === this.yourId ? "나" : msg.ringer.slice(0, 6);
      this.log(`${who} 종치기 ${msg.correct ? "성공" : "실패"}`);
    } else if (msg.type === "match_end") {
      this.view = { ...this.view, finished: true, winnerId: msg.winner_profile_id };
      const who = msg.winner_profile_id === this.yourId ? "나" : msg.winner_profile_id?.slice(0, 6) ?? "없음";
      this.log(`게임 종료 - 승자: ${who} (상금 ${msg.pot})`);
      this.emit();
    } else if (msg.type === "error") {
      console.warn("match error:", msg.detail);
    }
  }

  flip() {
    this.conn.flip();
  }

  ring() {
    this.conn.ring();
  }

  destroy() {
    this.conn.close();
  }
}
