<script setup lang="ts">
const emit = defineEmits<{ single: []; online: [] }>();
</script>

<template>
  <div class="screen">
    <h1>할리갈리 온라인</h1>
    <div class="panel">
      <button @click="emit('single')">싱글 플레이</button>
      <button class="secondary" @click="emit('online')">온라인 플레이</button>
    </div>
  </div>
</template>
