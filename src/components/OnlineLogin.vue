<script setup lang="ts">
import { ref } from "vue";
import * as api from "../api";
import type { Profile } from "../api";
import { supabaseConfigured } from "../supabaseClient";

const emit = defineEmits<{ back: []; "logged-in": [profile: Profile | null] }>();

const email = ref("");
const password = ref("");
const err = ref("");

async function login() {
  err.value = "";
  try {
    await api.signUpOrSignIn(email.value.trim(), password.value);
    const profile = await api.getMyProfile();
    emit("logged-in", profile);
  } catch (e: any) {
    err.value = e.message ?? String(e);
  }
}
</script>

<template>
  <div class="screen" v-if="!supabaseConfigured">
    <h1>온라인 플레이</h1>
    <div class="panel">
      <p class="error-text">Supabase 설정이 없습니다.</p>
      <p>
        client/.env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 를
        채워주세요 (client/.env.example 참고). 백엔드도 backend/.env 에
        같은 프로젝트의 키를 채우고 실행해야 합니다.
      </p>
      <button class="secondary" @click="emit('back')">뒤로</button>
    </div>
  </div>

  <div class="screen" v-else>
    <h1>로그인 / 회원가입</h1>
    <div class="panel">
      <label>이메일 <input v-model="email" type="email" /></label>
      <label>비밀번호 <input v-model="password" type="password" /></label>
      <div class="error-text">{{ err }}</div>
      <div class="row">
        <button @click="login">로그인 / 가입</button>
        <button class="secondary" @click="emit('back')">뒤로</button>
      </div>
    </div>
  </div>
</template>
