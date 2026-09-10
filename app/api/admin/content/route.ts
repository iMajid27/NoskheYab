import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const content = await query(
    `SELECT id, page_key, title, body, updated_at FROM site_content ORDER BY page_key`
  );
  return NextResponse.json({ content });
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const { pageKey, title, body } = await request.json();
  if (!pageKey || !title || typeof body !== 'string') {
    return NextResponse.json({ error: 'اطلاعات ناقص' }, { status: 400 });
  }

  const existing = await queryOne(`SELECT id FROM site_content WHERE page_key = $1`, [pageKey]);
  if (existing) {
    await query(
      `UPDATE site_content SET title = $1, body = $2, updated_at = now() WHERE page_key = $3`,
      [title, body, pageKey]
    );
  } else {
    await query(
      `INSERT INTO site_content (page_key, title, body) VALUES ($1, $2, $3)`,
      [pageKey, title, body]
    );
  }

  return NextResponse.json({ success: true });
}
