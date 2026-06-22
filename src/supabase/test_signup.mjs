// Script to drop the broken trigger using Supabase's pg_net extension
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://towxndlgqtrrubzlizud.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvd3huZGxncXRycnViemxpenVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyODA5MzYsImV4cCI6MjA5Njg1NjkzNn0.9HnhFscWOfrV6G7C6l1A1JmNk0t_n8LyG9zF0-nOnuY'
);

async function tryDropTrigger() {
  // Try using rpc to run raw SQL (if available)
  const queries = [
    "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users",
    "DROP FUNCTION IF EXISTS handle_new_user()",
  ];

  for (const sql of queries) {
    console.log('Trying:', sql);
    const { data, error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      console.log('  rpc failed:', error.message);
      // Try raw postgrest
      const { data: d2, error: e2 } = await supabase.rpc(sql);
      if (e2) console.log('  alt also failed:', e2.message);
    } else {
      console.log('  SUCCESS:', data);
    }
  }

  // Check if we can query pg_catalog for triggers
  console.log('\nChecking triggers on auth.users...');
  const { data, error } = await supabase
    .from('pg_trigger')
    .select('tgname')
    .limit(5);
  console.log('pg_trigger query:', error ? error.message : data);
}

tryDropTrigger();
