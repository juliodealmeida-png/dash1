import type { SupabaseClient } from '@supabase/supabase-js';
import { jitter, resolveCoords } from '../data/geocoords.js';

export async function geocodeLeads(supabase: SupabaseClient): Promise<number> {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, company_country, city')
    .is('lat', null);

  if (error || !leads?.length) return 0;

  let n = 0;
  for (const lead of leads) {
    const coords = resolveCoords(lead.company_country, lead.city);
    if (!coords) continue;
    const j = jitter(coords, 0.8);
    const { error: upErr } = await supabase
      .from('leads')
      .update({ lat: j.lat, lng: j.lng, city: lead.city ?? null })
      .eq('id', lead.id);
    if (!upErr) n++;
  }
  return n;
}

export function geocodeSignal(signal: {
  country?: string | null;
  city?: string | null;
  description?: string | null;
}): { lat: number; lng: number } | null {
  if (signal.city || signal.country) {
    const coords = resolveCoords(signal.country, signal.city);
    if (coords) return jitter(coords, 0.5);
  }
  const desc = signal.description?.trim();
  if (desc) {
    const cityMatch = desc.match(/^([^:·]+)[:·]/);
    if (cityMatch) {
      const extracted = cityMatch[1].trim();
      const coords = resolveCoords(undefined, extracted);
      if (coords) return jitter(coords, 0.5);
    }
  }
  return null;
}
