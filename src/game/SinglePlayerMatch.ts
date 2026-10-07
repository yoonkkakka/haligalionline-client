import { buildShuffledDeck, Card, FRUITS, RULE_TARGET, RuleMode } from "./deck";
import { MatchView } from "./MatchView";

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  faceDown: Card[];
  faceUp: Card[];
}

export type MatchEvent =
  | { type: "state" }
  | { type: "ring_result"; ringerId: string; correct: boolean }
  | { type: "match_end"; winnerId: string | null };

type Listener = (event: MatchEvent) => void;

const BOT_MIN_REACTION_MS = 350;
const BOT_MAX_REACTION_MS = 1400;

export class SinglePlayerMatch {
  players: PlayerState[];
  turnIndex = 0;
  ruleMode: RuleMode;
  target: number;
  bellAvailable = false;
  finished = false;
  winnerId: string | null = null;

  private listeners: Listener[] = [];
  private botTimers: number[] = [];
  private nextBotFlipTimer: number | null = null;

  constructor(humanName: string, botCount: number, ruleMode: RuleMode) {
    this.ruleMode = ruleMode;
    this.target = RULE_TARGET[ruleMode];
    this.players = [{ id: "you", name: humanName, isBot: false, faceDown: [], faceUp: [] }];
    for (let i = 0; i < botCount; i++) {
      this.players.push({ id: `bot${i}`, name: `상대 ${i + 1}`, isBot: true, faceDown: [], faceUp: [] });
    }
    const deck = buildShuffledDeck();
    deck.forEach((card, i) => this.players[i % this.players.length].faceDown.push(card));
    this.scheduleBotTurnIfNeeded();
  }

  on(listener: Listener) {
    this.listeners.push(listener);
  }

  private emit(event: MatchEvent) {
    for (const l of this.listeners) l(event);
  }

  get currentPlayer(): PlayerState {
    return this.players[this.turnIndex];
  }

  private activePlayers(): PlayerState[] {
    return this.players.filter((p) => p.faceDown.length + p.faceUp.length > 0);
  }

  private topCard(p: PlayerState): Card | undefined {
    return p.faceUp[p.faceUp.length - 1];
  }

  visibleSum(fruit: string): number {
    return this.players.reduce((sum, p) => {
      const top = this.topCard(p);
      return top && top.fruit === fruit ? sum + top.count : sum;
    }, 0);
  }

  private advanceTurn() {
    const active = this.activePlayers();
    if (active.length <= 1) return;
    const n = this.players.length;
    // Must have a faceDown pile, not just any cards: a player can be down
    // to only face-up cards (their face-down pile ran out mid-rotation, or
    // they gave cards away on a wrong ring) and still be "active" for the
    // win condition, but have nothing left to legally flip. Assigning them
    // the flip-turn anyway deadlocks the match — every flip is rejected
    // forever with nothing to reroute around it.
    for (let step = 1; step <= n; step++) {
      const candidate = this.players[(this.turnIndex + step) % n];
      if (candidate.faceDown.length > 0) {
        this.turnIndex = this.players.indexOf(candidate);
        return;
      }
    }
    // Nobody has a faceDown pile right now (every remaining card is on some
    // faceUp pile) — leave the turn where it is; the next correct ring
    // collects all faceUp cards into the ringer's faceDown pile, which
    // checkFinished's reroute then picks up.
  }

  flip(playerId: string): Card | null {
    if (this.finished) return null;
    const player = this.currentPlayer;
    if (player.id !== playerId) return null;
    if (player.faceDown.length === 0) return null;
    const card = player.faceDown.pop()!;
    player.faceUp.push(card);
    // Real Halli Galli rule: the bell is only correct at an EXACT match. If a
    // sum overshoots the target (e.g. 3+3=6 when target is 5) before anyone
    // rings, that opportunity is gone until some fruit's count resets via a
    // ring — it does not stay ringable at ">= target" forever.
    this.bellAvailable = FRUITS.some((f) => this.visibleSum(f) === this.target);
    this.advanceTurn();
    this.emit({ type: "state" });
    if (this.bellAvailable) this.scheduleBotRings();
    this.checkFinished();
    return card;
  }

  ring(playerId: string): boolean {
    if (this.finished) return false;
    this.clearBotTimers();
    const ringer = this.players.find((p) => p.id === playerId)!;
    const correct = this.bellAvailable;
    if (correct) {
      const won: Card[] = [];
      for (const p of this.players) {
        won.push(...p.faceUp);
        p.faceUp = [];
      }
      ringer.faceDown = [...won, ...ringer.faceDown];
      this.bellAvailable = false;
    } else {
      for (const p of this.players) {
        if (p === ringer || p.faceDown.length + p.faceUp.length === 0) continue;
        if (ringer.faceDown.length) p.faceDown.push(ringer.faceDown.shift()!);
        else if (ringer.faceUp.length) p.faceDown.push(ringer.faceUp.shift()!);
      }
    }
    this.emit({ type: "ring_result", ringerId: playerId, correct });
    this.emit({ type: "state" });
    this.checkFinished();
    return correct;
  }

  private checkFinished() {
    const active = this.activePlayers();
    if (active.length <= 1) {
      this.finished = true;
      this.winnerId = active[0]?.id ?? null;
      this.clearBotTimers();
      this.emit({ type: "match_end", winnerId: this.winnerId });
      return;
    }
    // Whoever's turn it is right now might not be able to legally flip —
    // this is the path that actually matters, since ring() changes card
    // distribution but never calls advanceTurn itself.
    if (this.currentPlayer.faceDown.length === 0) {
      this.advanceTurn();
    }
    this.scheduleBotTurnIfNeeded();
  }

  /** Bots "notice" the bell is ringable after a random human-like delay. */
  private scheduleBotRings() {
    for (const p of this.players) {
      if (!p.isBot) continue;
      const delay = BOT_MIN_REACTION_MS + Math.random() * (BOT_MAX_REACTION_MS - BOT_MIN_REACTION_MS);
      const timer = window.setTimeout(() => {
        if (this.finished || !this.bellAvailable) return;
        this.ring(p.id);
      }, delay);
      this.botTimers.push(timer);
    }
  }

  private clearBotTimers() {
    this.botTimers.forEach((t) => window.clearTimeout(t));
    this.botTimers = [];
    if (this.nextBotFlipTimer !== null) {
      window.clearTimeout(this.nextBotFlipTimer);
      this.nextBotFlipTimer = null;
    }
  }

  /** Whenever it becomes a bot's turn, it flips on its own after a short
   * delay. Called from the constructor and after every flip/ring settles
   * (via checkFinished), so the chain keeps itself going — callers never
   * need to re-arm this manually. */
  private scheduleBotTurnIfNeeded() {
    if (this.nextBotFlipTimer !== null) {
      window.clearTimeout(this.nextBotFlipTimer);
      this.nextBotFlipTimer = null;
    }
    if (this.finished) return;
    const player = this.currentPlayer;
    if (!player.isBot) return;
    this.nextBotFlipTimer = window.setTimeout(() => {
      this.nextBotFlipTimer = null;
      if (this.finished || this.currentPlayer.id !== player.id) return;
      this.flip(player.id);
    }, 500 + Math.random() * 500);
  }

  destroy() {
    this.clearBotTimers();
  }

  toView(): MatchView {
    return {
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        faceDownCount: p.faceDown.length,
        topCard: this.topCard(p),
        totalCards: p.faceDown.length + p.faceUp.length,
      })),
      currentPlayerId: this.finished ? null : this.currentPlayer.id,
      bellAvailable: this.bellAvailable,
      finished: this.finished,
      winnerId: this.winnerId,
      target: this.target,
      ruleMode: this.ruleMode,
    };
  }
}
