<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Engine } from "../engine/Engine";
import type { RuleMode } from "../game/deck";
import type { MatchView } from "../game/MatchView";
import { OnlineMatch } from "../game/OnlineMatch";
import { FlipHitbox, hitTestBell, renderMatch } from "../game/Renderer";
import { SinglePlayerMatch } from "../game/SinglePlayerMatch";

const props = defineProps<{
  mode: "single" | "online";
  botCount?: number;
  rule?: RuleMode;
  matchId?: string;
  token?: string;
  yourId?: string;
}>();
const emit = defineEmits<{ exit: [] }>();

const boardEl = ref<HTMLElement | null>(null);
const logEl = ref<HTMLElement | null>(null);
const log = ref<string[]>([]);
const finished = ref(false);
const turnLabel = ref("진행중...");
const yourId = props.mode === "single" ? "you" : props.yourId!;

let engine: Engine | null = null;
let single: SinglePlayerMatch | null = null;
let online: OnlineMatch | null = null;
let hitboxes: FlipHitbox[] = [];

function getView(): MatchView {
  return props.mode === "single" ? single!.toView() : online!.view;
}

function doFlip() {
  if (props.mode === "single") single!.flip(yourId);
  else online!.flip();
}

function doRing() {
  if (props.mode === "single") single!.ring(yourId);
  else online!.ring();
}

function pushLog(text: string) {
  log.value.push(text);
  requestAnimationFrame(() => {
    if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight;
  });
}

function refreshHud() {
  const view = getView();
  finished.value = view.finished;
  if (view.finished) {
    turnLabel.value = view.winnerId === yourId ? "승리!" : view.winnerId ? "패배..." : "게임 종료";
  } else {
    const turnName = view.players.find((p) => p.id === view.currentPlayerId)?.name ?? "";
    turnLabel.value = `현재 턴: ${turnName}`;
  }
}

function keyHandler(e: KeyboardEvent) {
  if (e.code === "Space") {
    e.preventDefault();
    doRing();
  }
}

onMounted(() => {
  if (props.mode === "single") {
    single = new SinglePlayerMatch("나", props.botCount ?? 1, props.rule ?? "classic");
    single.on((ev) => {
      refreshHud();
      if (ev.type === "ring_result") {
        const name = single!.players.find((p) => p.id === ev.ringerId)?.name;
        pushLog(`${name} 종치기 ${ev.correct ? "성공" : "실패"}`);
      } else if (ev.type === "match_end") {
        const name = single!.players.find((p) => p.id === ev.winnerId)?.name ?? "없음";
        pushLog(`게임 종료 - 승자: ${name}`);
      }
    });
  } else {
    online = new OnlineMatch(props.matchId!, props.token!, yourId);
    online.onUpdate(refreshHud);
    online.onLog(pushLog);
  }
  refreshHud();

  engine = new Engine(boardEl.value!);
  engine.onRender((ctx, w, h) => {
    hitboxes = renderMatch(ctx, w, h, getView(), yourId);
  });
  engine.onPointerDown(({ x, y }) => {
    const view = getView();
    if (view.finished) return;
    const hb = hitboxes.find((h) => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (hb && view.currentPlayerId === yourId) {
      doFlip();
      return;
    }
    if (hitTestBell(boardEl.value!.clientWidth, boardEl.value!.clientHeight, x, y)) doRing();
  });
  engine.start();
  window.addEventListener("keydown", keyHandler);
});

onUnmounted(() => {
  window.removeEventListener("keydown", keyHandler);
  engine?.destroy();
  single?.destroy();
  online?.destroy();
});
</script>

<template>
  <div class="game-screen">
    <div class="hud">
      <div>{{ turnLabel }}</div>
      <button class="secondary" @click="emit('exit')">나가기</button>
    </div>
    <div class="game-board" ref="boardEl">
      <button class="ring-btn" :disabled="finished" @click="doRing">종치기 (Space)</button>
    </div>
    <div class="log-panel" ref="logEl">
      <div v-for="(line, i) in log" :key="i">{{ line }}</div>
    </div>
  </div>
</template>
