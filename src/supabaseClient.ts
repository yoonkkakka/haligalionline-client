import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

// When env vars are missing (e.g. this repo just scaffolded, before real
// Supabase keys are filled in), export a client pointed nowhere rather than
// throwing at import time — online-mode UI checks supabaseConfigured and
// shows a setup hint instead of calling this.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");
