import { FRUIT_COLOR, FRUIT_LABEL } from "./deck";
import { MatchView, PlayerView } from "./MatchView";

interface PlayerLayout {
  player: PlayerView;
  cx: number;
  cy: number;
}

export interface FlipHitbox {
  playerId: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const CARD_W = 70;
const CARD_H = 96;

function layoutPlayers(players: PlayerView[], width: number, height: number): PlayerLayout[] {
  const margin = 90;
  if (players.length <= 2) {
    return players.map((player, i) => ({
      player,
      cx: width / 2,
      cy: i === 0 ? height - margin : margin,
    }));
  }
  const positions = [
    { cx: width / 2, cy: height - margin }, // you
    { cx: margin + 20, cy: height / 2 }, // left
    { cx: width / 2, cy: margin }, // top
    { cx: width - margin - 20, cy: height / 2 }, // right
  ];
  return players.map((player, i) => ({ player, ...positions[i % positions.length] }));
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, faceUp: boolean, fruit?: string, count?: number) {
  ctx.save();
  ctx.translate(x - CARD_W / 2, y - CARD_H / 2);
  ctx.fillStyle = faceUp ? "#fffaf0" : "#2d3142";
  ctx.strokeStyle = "#1b1d29";
  ctx.lineWidth = 2;
  const r = 8;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, r);
  ctx.fill();
  ctx.stroke();

  if (faceUp && fruit) {
    const color = FRUIT_COLOR[fruit as keyof typeof FRUIT_COLOR];
    ctx.fillStyle = color;
    const n = count ?? 1;
    const cols = n <= 3 ? n : Math.ceil(n / 2);
    const rows = Math.ceil(n / cols);
    const cellW = (CARD_W - 16) / cols;
    const cellH = (CARD_H - 30) / rows;
    let drawn = 0;
    for (let row = 0; row < rows && drawn < n; row++) {
      for (let col = 0; col < cols && drawn < n; col++) {
        const cx = 8 + cellW * col + cellW / 2;
        const cy = 22 + cellH * row + cellH / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(cellW, cellH) / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        drawn++;
      }
    }
    ctx.fillStyle = "#1b1d29";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(String(n), CARD_W / 2, 14);
  } else {
    ctx.fillStyle = "#565b78";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("?", CARD_W / 2, CARD_H / 2 + 7);
  }
  ctx.restore();
}

export function renderMatch(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  view: MatchView,
  yourId: string
): FlipHitbox[] {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#14161f";
  ctx.fillRect(0, 0, width, height);

  const hitboxes: FlipHitbox[] = [];
  const layouts = layoutPlayers(view.players, width, height);

  const bellX = width / 2;
  const bellY = height / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(bellX, bellY, view.bellAvailable ? 46 : 38, 0, Math.PI * 2);
  ctx.fillStyle = view.bellAvailable ? "#ffd23f" : "#3a3d52";
  ctx.shadowColor = view.bellAvailable ? "#ffd23f" : "transparent";
  ctx.shadowBlur = view.bellAvailable ? 25 : 0;
  ctx.fill();
  ctx.font = "28px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("bell", bellX, bellY + 6);
  ctx.restore();

  ctx.fillStyle = "#c9cbe0";
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    `목표: 한 과일 ${view.target}개 (${view.ruleMode === "classic" ? "기본" : "엑스트라"} 모드)`,
    bellX,
    bellY - 60
  );

  for (const { player, cx, cy } of layouts) {
    const isTurn = view.currentPlayerId === player.id;

    ctx.fillStyle = isTurn ? "#ffd23f" : "#c9cbe0";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${player.name}${isTurn ? " ▶" : ""}`, cx, cy - CARD_H / 2 - 40);
    ctx.fillStyle = "#8b8fb3";
    ctx.font = "12px sans-serif";
    ctx.fillText(`남은 카드 ${player.totalCards}`, cx, cy - CARD_H / 2 - 22);

    const deckX = cx - 50;
    const upX = cx + 50;
    drawCard(ctx, deckX, cy, false);
    if (player.topCard) drawCard(ctx, upX, cy, true, player.topCard.fruit, player.topCard.count);

    if (player.id === yourId && player.faceDownCount > 0) {
      hitboxes.push({ playerId: player.id, x: deckX - CARD_W / 2, y: cy - CARD_H / 2, w: CARD_W, h: CARD_H });
    }

    if (player.topCard) {
      ctx.fillStyle = "#8b8fb3";
      ctx.font = "11px sans-serif";
      ctx.fillText(FRUIT_LABEL[player.topCard.fruit], upX, cy + CARD_H / 2 + 16);
    }
  }

  return hitboxes;
}

export function hitTestBell(width: number, height: number, x: number, y: number): boolean {
  const dx = x - width / 2;
  const dy = y - height / 2;
  return Math.sqrt(dx * dx + dy * dy) <= 50;
}
