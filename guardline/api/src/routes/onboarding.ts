import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppEnv } from '../config/env.js';

export function onboardingRoutes(_env: AppEnv, supabase: SupabaseClient) {
  const r = Router();

  /* GET /api/onboarding/status — check if current user completed onboarding */
  r.get('/status', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token' });
      return;
    }
    const token = auth.slice(7);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userData.user.id)
      .single();

    res.json({
      success: true,
      data: {
        completed: profile?.onboarding_completed ?? false,
        profile: profile ?? null,
      },
    });
  });

  /* POST /api/onboarding/complete — save onboarding data */
  r.post('/complete', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token' });
      return;
    }
    const token = auth.slice(7);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    const { full_name, birthday, gender, role } = req.body;
    if (!full_name) {
      res.status(400).json({ success: false, error: 'full_name required' });
      return;
    }
    const row = {
      user_id: userData.user.id,
      email: userData.user.email ?? '',
      full_name,
      birthday: birthday || null,
      gender: gender || null,
      role: role || 'sdr',
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert(row, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }
    res.json({ success: true, data });
  });

  /* GET /api/onboarding/admin/profiles — list all profiles (admin only) */
  r.get('/admin/profiles', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token' });
      return;
    }
    const token = auth.slice(7);
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    // Check admin role
    const { data: callerProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .single();
    if (!callerProfile || !['admin', 'founder'].includes(callerProfile.role)) {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }
    res.json({ success: true, data: profiles ?? [] });
  });

  return r;
}
