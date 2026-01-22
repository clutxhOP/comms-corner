import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ypbdxgcumtbtfknpoykp.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwYmR4Z2N1bXRidGZrbnBveWtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNzc3ODYsImV4cCI6MjA4NDY1Mzc4Nn0.wWia7rLIZGxelFNbuUWSp9HPAV18A2w81mNmBNz7o_M";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
