import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cloud sync is entirely optional — without these env vars set, the app
// keeps working exactly as before (local-only, no network calls).
export const isSyncConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSyncConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;
