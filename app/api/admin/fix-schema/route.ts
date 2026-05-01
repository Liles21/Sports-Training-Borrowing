import { getSupabaseServiceClient } from "@/lib/server/supabase";

export async function POST(): Promise<Response> {
  const supabase = getSupabaseServiceClient();

  const queries = [
    'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();',
    'ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();',
    'ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();',
    'ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_at timestamptz default now();',
    'ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz default now();',
    'ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS created_at timestamptz default now();',
    'ALTER TABLE public.borrow_requests ADD COLUMN IF NOT EXISTS created_at timestamptz default now();',
    'ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at timestamptz default now();',
  ];

  const results = [];
  
  for (const query of queries) {
    const { error } = await supabase.rpc('execute_sql', { sql: query });
    results.push({ query, error: error?.message || 'ok' });
  }

  return Response.json({ success: true, results });
}
