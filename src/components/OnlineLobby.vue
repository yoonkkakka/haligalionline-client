<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import * as api from "../api";
import type { Profile } from "../api";
import type { RuleMode } from "../game/deck";
import { ChatConnection, type ChatMessage, joinMatchmaking } from "../network";

const props = defineProps<{ profile: Profile }>();
const emit = defineEmits<{
  logout: [];
  matched: [cfg: { matchId: string; token: string; yourId: string }];
  refreshed: [profile: Profile];
}>();

const mode = ref<"2p" | "4p">("2p");
const rule = ref<RuleMode>("classic");
const bet = ref(100);
const err = ref("");
const queuing = ref(false);

const chatMessages = ref<ChatMessage[]>([]);
const chatInput = ref("");
const chatBoxEl = ref<HTMLElement | null>(null);

let chat: ChatConnection | null = null;
let token = "";

onMounted(async () => {
  token = await api.getAccessToken();
  chat = new ChatConnection(token, (messages) => {
    chatMessages.value.push(...messages);
    requestAnimationFrame(() => {
      if (chatBoxEl.value) chatBoxEl.value.scrollTop = chatBoxEl.value.scrollHeight;
    });
  });
});

onUnmounted(() => {
  chat?.close();
});

function sendChat() {
  if (!chatInput.value.trim() || !chat) return;
  chat.send(chatInput.value.trim());
  chatInput.value = "";
}

async function refill() {
  try {
    const updated = await api.refillGameMoney();
    emit("refreshed", updated);
  } catch (e: any) {
    alert(e.message ?? String(e));
  }
}

async function startQueue() {
  err.value = "";
  queuing.value = true;
  try {
    chat?.close();
    const { matchId } = await joinMatchmaking(mode.value, rule.value, bet.value);
    emit("matched", { matchId, token, yourId: props.profile.id });
  } catch (e: any) {
    err.value = e.message ?? String(e);
    queuing.value = false;
  }
}

async function logout() {
  await api.signOut();
  emit("logout");
}
</script>

<template>
  <div class="screen">
    <h1>로비 - {{ profile.nickname }} (Lv.{{ profile.level }})</h1>
    <div class="row" style="align-items: flex-start">
      <div class="panel">
        <div>보유 머니: {{ profile.game_money }}</div>
        <button v-if="profile.game_money === 0" @click="refill">머니 리필</button>
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
            <option value="classic">기본 (5개)</option>
            <option value="extra">엑스트라 (3개)</option>
          </select>
        </label>
        <label>베팅 금액 <input v-model.number="bet" type="number" min="0" /></label>
        <div class="error-text">{{ err }}</div>
        <button :disabled="queuing" @click="startQueue">{{ queuing ? "매칭 중..." : "매칭 시작" }}</button>
        <button class="secondary" @click="logout">로그아웃</button>
      </div>
      <div class="panel chat-panel">
        <div>월드 채팅 ({{ api.REGION_LABEL[profile.region] }} 서버)</div>
        <div class="chat-messages" ref="chatBoxEl">
          <div v-for="m in chatMessages" :key="m.id">[{{ m.nickname }}] {{ m.message }}</div>
        </div>
        <div class="row">
          <input v-model="chatInput" placeholder="메시지 입력" style="flex: 1" @keyup.enter="sendChat" />
          <button @click="sendChat">전송</button>
        </div>
      </div>
    </div>
  </div>
</template>
