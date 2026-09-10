import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const messages = await query(`SELECT id, name, phone, message, status, created_at FROM contact_messages ORDER BY created_at DESC`);
  const settings = await query(`SELECT key, value FROM site_settings WHERE key LIKE 'contact_%' ORDER BY key`);
  return NextResponse.json({ messages, settings });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const body = await request.json() as { key?: string; value?: string };
  if (!body.key?.startsWith('contact_') || typeof body.value !== 'string' || body.value.length > 1000) {
    return NextResponse.json({ error: 'اطلاعات تنظیمات معتبر نیست' }, { status: 400 });
  }
  await query(`INSERT INTO site_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [body.key, body.value.trim()]);
  return NextResponse.json({ success: true });
}
