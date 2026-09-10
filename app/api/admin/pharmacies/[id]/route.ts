import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const pharmacy = await queryOne(
    `SELECT p.*, c.name as city_name
     FROM pharmacies p LEFT JOIN cities c ON p.city_id = c.id
     WHERE p.id = $1`,
    [params.id]
  );

  if (!pharmacy) {
    return NextResponse.json({ error: 'داروخانه یافت نشد' }, { status: 404 });
  }

  const documents = await query(
    `SELECT id, document_type, object_key, created_at FROM pharmacy_documents WHERE pharmacy_id = $1`,
    [params.id]
  );

  return NextResponse.json({ pharmacy, documents });
}
