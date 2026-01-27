import { createClient } from '@supabase/supabase-js';

// External Supabase project for businesses table
const EXTERNAL_SUPABASE_URL = "https://ycjyrjacwhnvulwzbzxw.supabase.co";
const EXTERNAL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanlyamFjd2hudnVsd3pienh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTA1MjYsImV4cCI6MjA3NzkyNjUyNn0.1CeeTzkiwSIQUqvu-hqGyr4e_nfz5YYXMcq2bXfKXdI";

export const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);
