import { Router } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import type { AppEnv } from '../config/env.js';

export function authRoutes(_env: AppEnv, supabase: SupabaseClient) {
  const r = Router();

  /* POST /api/auth/login */
  r.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' });
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      res.status(401).json({ success: false, error: error.message });
      return;
    }
    res.json({
      success: true,
      data: {
        token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: data.user?.user_metadata?.name ?? email.split('@')[0],
          role: data.user?.user_metadata?.role ?? 'admin',
        },
      },
    });
  });

  /* GET /api/auth/me — verify token */
  r.get('/me', async (req, res) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No token' });
      return;
    }
    const token = auth.slice(7);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }
    res.json({
      success: true,
      data: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0],
        role: data.user.user_metadata?.role ?? 'admin',
      },
    });
  });

  /* POST /api/auth/reset-password */
  r.post('/reset-password', async (req, res) => {
    const { access_token, new_password } = req.body;
    if (!access_token || !new_password) {
      res.status(400).json({ success: false, error: 'access_token and new_password required' });
      return;
    }
    const { error } = await supabase.auth.admin.updateUserById(
      (await supabase.auth.getUser(access_token)).data.user?.id ?? '',
      { password: new_password }
    );
    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    res.json({ success: true });
  });

  /* POST /api/auth/forgot-password */
  r.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email required' });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:3000/guardline.html',
    });
    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    res.json({ success: true, message: 'Reset email sent' });
  });

  return r;
}
