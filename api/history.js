import { listHistory, getSupabase } from './supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (!getSupabase()) {
    res.status(200).json({ history: [], note: 'Supabase 未配置' });
    return;
  }
  const history = await listHistory(20);
  res.status(200).json({ history });
}
