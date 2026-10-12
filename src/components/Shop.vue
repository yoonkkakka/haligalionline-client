<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import * as api from "../api";
import type { ItemDef, Profile } from "../api";

const props = defineProps<{ profile: Profile }>();
const emit = defineEmits<{ back: []; refreshed: [profile: Profile] }>();

const money = computed(() => props.profile.game_money);

const items = ref<ItemDef[]>([]);
const ownedIds = ref<Set<string>>(new Set());
const loading = ref(true);
const err = ref("");
const buyingId = ref<string | null>(null);

// Shop-purchasable = publicly listed items with a price set (price 0 means
// "not for sale", e.g. an item someone uploaded only for themselves).
const shopItems = computed(() => items.value.filter((i) => i.is_public && i.price > 0));

async function load() {
  loading.value = true;
  try {
    const [all, mine] = await Promise.all([api.listItems(), api.listMyItems()]);
    items.value = all;
    ownedIds.value = new Set(mine.map((r) => r.item_id));
  } catch (e: any) {
    err.value = e.message ?? String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function buy(item: ItemDef) {
  err.value = "";
  buyingId.value = item.id;
  try {
    await api.buyItem(item.id);
    ownedIds.value.add(item.id);
    const updated = await api.getMyProfile();
    if (updated) emit("refreshed", updated);
  } catch (e: any) {
    err.value = e.message ?? String(e);
  } finally {
    buyingId.value = null;
  }
}

// --- Upload (so there's something to sell in the first place) ---
const uploadName = ref("");
const uploadPrice = ref(500);
const uploadSpeedBonus = ref(0);
const uploadFile = ref<File | null>(null);
const uploadErr = ref("");
const uploading = ref(false);

function onFileChange(e: Event) {
  uploadFile.value = (e.target as HTMLInputElement).files?.[0] ?? null;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function upload() {
  uploadErr.value = "";
  if (!uploadName.value.trim()) {
    uploadErr.value = "이름을 입력하세요";
    return;
  }
  if (!uploadFile.value) {
    uploadErr.value = "이미지를 선택하세요";
    return;
  }
  uploading.value = true;
  try {
    const dataUrl = await readAsDataUrl(uploadFile.value);
    const statBonus: Record<string, number> = uploadSpeedBonus.value ? { speed: uploadSpeedBonus.value } : {};
    const created = await api.createItem(uploadName.value.trim(), dataUrl, statBonus, uploadPrice.value);
    items.value.unshift(created);
    ownedIds.value.add(created.id); // uploading grants it to you for free, same as before
    uploadName.value = "";
    uploadFile.value = null;
    uploadPrice.value = 500;
    uploadSpeedBonus.value = 0;
  } catch (e: any) {
    uploadErr.value = e.message ?? String(e);
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="screen">
    <h1>상점 - 보유 머니: {{ money }}</h1>
    <div class="row" style="align-items: flex-start">
      <div class="panel" style="min-width: 420px">
        <div v-if="loading">불러오는 중...</div>
        <div v-else-if="shopItems.length === 0">아직 판매 중인 아이템이 없습니다. 오른쪽에서 먼저 업로드해보세요.</div>
        <div v-else class="shop-grid">
          <div v-for="item in shopItems" :key="item.id" class="shop-item">
            <img :src="item.image_base64" :alt="item.name" class="shop-item-img" />
            <div class="shop-item-name">{{ item.name }}</div>
            <div class="shop-item-bonus" v-if="Object.keys(item.stat_bonus).length">
              <span v-for="(v, k) in item.stat_bonus" :key="k">{{ k }} +{{ v }}</span>
            </div>
            <div class="shop-item-price">{{ item.price }} 머니</div>
            <button v-if="ownedIds.has(item.id)" class="secondary" disabled>보유중</button>
            <button
              v-else
              :disabled="buyingId === item.id || money < item.price"
              @click="buy(item)"
            >
              {{ buyingId === item.id ? "구매 중..." : "구매" }}
            </button>
          </div>
        </div>
        <div class="error-text">{{ err }}</div>
        <button class="secondary" @click="emit('back')">뒤로</button>
      </div>

      <div class="panel" style="min-width: 260px">
        <div>내 아이템 업로드</div>
        <label>이름 <input v-model="uploadName" /></label>
        <label>이미지 <input type="file" accept="image/*" @change="onFileChange" /></label>
        <label>판매 가격 (0 = 비공개) <input v-model.number="uploadPrice" type="number" min="0" /></label>
        <label>능력치 보너스: speed <input v-model.number="uploadSpeedBonus" type="number" step="0.01" /></label>
        <div class="error-text">{{ uploadErr }}</div>
        <button :disabled="uploading" @click="upload">{{ uploading ? "업로드 중..." : "업로드" }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.shop-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.shop-item {
  background: var(--input-bg);
  border: 1px solid var(--panel-border);
  border-radius: 10px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.shop-item-img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}
.shop-item-name {
  font-weight: bold;
  font-size: 13px;
}
.shop-item-bonus {
  font-size: 11px;
  color: var(--muted);
  display: flex;
  gap: 6px;
}
.shop-item-price {
  font-size: 12px;
  color: var(--muted);
}
</style>
