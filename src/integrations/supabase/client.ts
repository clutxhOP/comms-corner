import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ycjyrjacwhnvulwzbzxw.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
