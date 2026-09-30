import { supabase } from "./supabaseClient";

const BASE = (import.meta.env.VITE_BACKEND_HTTP_URL as string) || "http://localhost:8000";

export const REGIONS = [
  "seoul",
  "chungcheong",
  "daejeon",
  "sejong",
  "jeonbuk",
  "jeonnam",
  "gwangju",
  "incheon",
  "gyeonggi",
  "jeju",
  "gangwon",
  "gyeongsang",
  "daegu",
  "busan",
  "ulsan",
] as const;

export const REGION_LABEL: Record<string, string> = {
  seoul: "서울",
  chungcheong: "충청",
  daejeon: "대전",
  sejong: "세종",
  jeonbuk: "전북",
  jeonnam: "전남",
  gwangju: "광주",
  incheon: "인천",
  gyeonggi: "경기",
  jeju: "제주",
  gangwon: "강원",
  gyeongsang: "경상",
  daegu: "대구",
  busan: "부산",
  ulsan: "울산",
};

async function authedFetch(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

export async function signUpOrSignIn(email: string, password: string) {
  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return signIn.data;
  const signUp = await supabase.auth.signUp({ email, password });
  if (signUp.error) throw signUp.error;
  return signUp.data;
}

export function signOut() {
  return supabase.auth.signOut();
}

export interface Profile {
  id: string;
  nickname: string;
  level: number;
  xp: number;
  game_money: number;
  region: string;
}

export async function getMyProfile(): Promise<Profile | null> {
  try {
    return await authedFetch("/profiles/me");
  } catch {
    return null;
  }
}

export function createProfile(nickname: string, region: string): Promise<Profile> {
  return authedFetch("/profiles", { method: "POST", body: JSON.stringify({ nickname, region }) });
}

export function refillGameMoney(): Promise<Profile> {
  return authedFetch("/profiles/me/refill", { method: "POST" });
}

export interface ItemDef {
  id: string;
  name: string;
  image_base64: string;
  stat_bonus: Record<string, number>;
  created_by: string;
  is_public: boolean;
}

export function listItems(): Promise<ItemDef[]> {
  return authedFetch("/items");
}

export function createItem(name: string, imageBase64: string, statBonus: Record<string, number>): Promise<ItemDef> {
  return authedFetch("/items", {
    method: "POST",
    body: JSON.stringify({ name, image_base64: imageBase64, stat_bonus: statBonus }),
  });
}

export function setEquipped(itemId: string, equipped: boolean) {
  return authedFetch(`/items/${itemId}/equip`, { method: "PATCH", body: JSON.stringify({ equipped }) });
}

export async function getAccessToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다");
  return token;
}
