<script setup lang="ts">
import { ref } from "vue";
import type { Profile } from "./api";
import type { RuleMode } from "./game/deck";

import HomeScreen from "./components/HomeScreen.vue";
import SingleSetup from "./components/SingleSetup.vue";
import GameBoard from "./components/GameBoard.vue";
import OnlineLogin from "./components/OnlineLogin.vue";
import ProfileSetup from "./components/ProfileSetup.vue";
import OnlineLobby from "./components/OnlineLobby.vue";

type Screen = "home" | "single-setup" | "single-game" | "online-login" | "profile-setup" | "lobby" | "online-game";

const screen = ref<Screen>("home");
const profile = ref<Profile | null>(null);

const singleConfig = ref<{ botCount: number; rule: RuleMode }>({ botCount: 1, rule: "classic" });
const onlineGameConfig = ref<{ matchId: string; token: string; yourId: string } | null>(null);

function goHome() {
  screen.value = "home";
}

function startSingle(botCount: number, rule: RuleMode) {
  singleConfig.value = { botCount, rule };
  screen.value = "single-game";
}

function onLoggedIn(p: Profile | null) {
  if (p) {
    profile.value = p;
    screen.value = "lobby";
  } else {
    screen.value = "profile-setup";
  }
}

function onProfileCreated(p: Profile) {
  profile.value = p;
  screen.value = "lobby";
}

function onProfileRefreshed(p: Profile) {
  profile.value = p;
}

function onMatched(cfg: { matchId: string; token: string; yourId: string }) {
  onlineGameConfig.value = cfg;
  screen.value = "online-game";
}

function onLogout() {
  profile.value = null;
  screen.value = "home";
}

function exitToLobby() {
  screen.value = profile.value ? "lobby" : "home";
}
</script>

<template>
  <HomeScreen v-if="screen === 'home'" @single="screen = 'single-setup'" @online="screen = 'online-login'" />

  <SingleSetup v-else-if="screen === 'single-setup'" @back="goHome" @start="startSingle" />

  <GameBoard
    v-else-if="screen === 'single-game'"
    mode="single"
    :bot-count="singleConfig.botCount"
    :rule="singleConfig.rule"
    @exit="screen = 'single-setup'"
  />

  <OnlineLogin v-else-if="screen === 'online-login'" @back="goHome" @logged-in="onLoggedIn" />

  <ProfileSetup v-else-if="screen === 'profile-setup'" @created="onProfileCreated" />

  <OnlineLobby
    v-else-if="screen === 'lobby' && profile"
    :profile="profile!"
    @logout="onLogout"
    @matched="onMatched"
    @refreshed="onProfileRefreshed"
  />

  <GameBoard
    v-else-if="screen === 'online-game' && onlineGameConfig"
    mode="online"
    :match-id="onlineGameConfig!.matchId"
    :token="onlineGameConfig!.token"
    :your-id="onlineGameConfig!.yourId"
    @exit="exitToLobby"
  />
</template>
