<script setup lang="ts">
import { ref } from "vue";
import * as api from "../api";
import type { Profile } from "../api";

const emit = defineEmits<{ created: [profile: Profile] }>();

const nickname = ref("");
const region = ref<string>(api.REGIONS[0]);
const err = ref("");

async function create() {
  err.value = "";
  if (!nickname.value.trim()) {
    err.value = "닉네임을 입력하세요";
    return;
  }
  try {
    const profile = await api.createProfile(nickname.value.trim(), region.value);
    emit("created", profile);
  } catch (e: any) {
    err.value = e.message ?? String(e);
  }
}
</script>

<template>
  <div class="screen">
    <h1>캐릭터 생성</h1>
    <div class="panel">
      <label>닉네임 <input v-model="nickname" /></label>
      <label>
        지역 (월드채팅 서버 결정)
        <select v-model="region">
          <option v-for="r in api.REGIONS" :key="r" :value="r">{{ api.REGION_LABEL[r] }}</option>
        </select>
      </label>
      <div class="error-text">{{ err }}</div>
      <button @click="create">시작하기</button>
    </div>
  </div>
</template>
