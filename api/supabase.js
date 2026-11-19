import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

let client = null;

export function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return client;
}

// 保存一条起名历史：需求、结果、使用模型
export async function saveHistory({ requirement, nameResult, modelName }) {
  const sb = getSupabase();
  if (!sb) return { saved: false, reason: 'Supabase 未配置' };
  const { error } = await sb.from('name_history').insert({
    user_requirement: requirement,
    name_result: nameResult,
    model_name: modelName,
  });
  if (error) return { saved: false, reason: error.message };
  return { saved: true };
}

export async function listHistory(limit = 20) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data } = await sb
    .from('name_history')
    .select('id, user_requirement, name_result, model_name, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}
