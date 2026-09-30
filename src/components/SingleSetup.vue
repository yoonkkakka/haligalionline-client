<script setup lang="ts">
import { ref } from "vue";
import type { RuleMode } from "../game/deck";

const emit = defineEmits<{ back: []; start: [botCount: number, rule: RuleMode] }>();

// Local (single-player) wallet — a lightweight stand-in for the real
// Supabase-backed game_money used in online mode. Single-player never talks
// to the backend, so its "리필" (spec #6) just resets this localStorage value.
const LOCAL_MONEY_KEY = "hg_local_money";

function getLocalMoney(): number {
  const raw = localStorage.getItem(LOCAL_MONEY_KEY);
  return raw ? Number(raw) : 1000;
}

function setLocalMoney(v: number) {
  localStorage.setItem(LOCAL_MONEY_KEY, String(v));
}

const money = ref(getLocalMoney());
const mode = ref<"2p" | "4p">("2p");
const rule = ref<RuleMode>("classic");

function refill() {
  setLocalMoney(500);
  money.value = 500;
}

function start() {
  const botCount = mode.value === "2p" ? 1 : 3;
  emit("start", botCount, rule.value);
}
</script>

<template>
  <div class="screen">
    <h1>싱글 플레이</h1>
    <div class="panel">
      <div>보유 머니: {{ money }}</div>
      <button v-if="money === 0" @click="refill">머니 리필 (+500)</button>
      <label>
        인원수
        <select v-model="mode">
          <option value="2p">2인</option>
          <option value="4p">4인</option>
        </select>
      </label>
      <label>
        모드
        <select v-model="rule">
          <option value="classic">기본 (과일 5개)</option>
          <option value="extra">엑스트라 (과일 3개)</option>
        </select>
      </label>
      <div class="row">
        <button @click="start">시작</button>
        <button class="secondary" @click="emit('back')">뒤로</button>
      </div>
    </div>
  </div>
</template>
