import { Router } from 'express';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppEnv } from '../config/env.js';

export function emailRoutes(env: AppEnv, supabase: SupabaseClient) {
  const r = Router();

  /* POST /api/email/send — send email via Groq-powered draft or direct */
  r.post('/send', async (req, res) => {
    const { to, subject, body, deal_id, from_name } = req.body;
    if (!to || !subject || !body) {
      res.status(400).json({ success: false, error: 'to, subject, and body required' });
      return;
    }

    // Log the email to assistant_interactions table
    try {
      await supabase.from('assistant_interactions').insert({
        lead_id: deal_id || null,
        channel: 'email',
        direction: 'outbound',
        message_preview: `${subject}: ${body.substring(0, 200)}`,
        sent_as: from_name || 'Julio De Almeida',
        status: 'sent',
      });
    } catch (_) { /* table may not exist yet */ }

    // For now, use n8n webhook to send email (WF10 handles multi-channel)
    const n8nBase = env.N8N_BASE_URL;
    if (n8nBase) {
      try {
        const webhookUrl = `${n8nBase}/webhook/wf10-guardline-virtual-assistant-v1`;
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trigger: 'manual',
            lead_id: deal_id,
            contact_email: to,
            contact_name: to.split('@')[0],
            channel_preference: 'email',
            context: `Subject: ${subject}\n\n${body}`,
          }),
        });
        if (resp.ok) {
          res.json({ success: true, method: 'n8n_wf10', message: 'Email queued via n8n' });
          return;
        }
      } catch (_) { /* n8n not available, fall through */ }
    }

    // Fallback: log as pending (manual send required)
    res.json({
      success: true,
      method: 'logged',
      message: 'Email logged. Configure n8n WF10 or SMTP for automatic sending.',
    });
  });

  /* GET /api/email/inbox — get emails linked to deals */
  r.get('/inbox', async (_req, res) => {
    try {
      const { data } = await supabase
        .from('assistant_interactions')
        .select('*')
        .eq('channel', 'email')
        .order('sent_at', { ascending: false })
        .limit(50);
      res.json({ success: true, data: { emails: data ?? [] } });
    } catch (_) {
      // Table may not exist yet
      res.json({ success: true, data: { emails: [] } });
    }
  });

  return r;
}
