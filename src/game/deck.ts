// Card model + deck builder. Mirrors backend/app/game_engine.py exactly so
// single-player (local) and online (server-authoritative) play feel identical.

export type Fruit = "strawberry" | "lime" | "banana" | "plum";
export type RuleMode = "classic" | "extra";

export const FRUITS: Fruit[] = ["strawberry", "lime", "banana", "plum"];

export const FRUIT_COLOR: Record<Fruit, string> = {
  strawberry: "#e0405a",
  lime: "#8bc34a",
  banana: "#f4c430",
  plum: "#7b4397",
};

export const FRUIT_LABEL: Record<Fruit, string> = {
  strawberry: "딸기",
  lime: "라임",
  banana: "바나나",
  plum: "자두",
};

export const RULE_TARGET: Record<RuleMode, number> = { classic: 5, extra: 3 };

export interface Card {
  fruit: Fruit;
  count: number;
}

const COUNT_MULTIPLICITY: Record<number, number> = { 1: 4, 2: 3, 3: 3, 4: 2, 5: 2 };

export function buildShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const fruit of FRUITS) {
    for (const [countStr, mult] of Object.entries(COUNT_MULTIPLICITY)) {
      const count = Number(countStr);
      for (let i = 0; i < mult; i++) deck.push({ fruit, count });
    }
  }
  // Fisher-Yates
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
