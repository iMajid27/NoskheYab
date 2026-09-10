import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';

interface NewItem {
  name: string;
  requestedQty: number;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user) return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
  const rows = await query(`SELECT p.id, p.tracking_code, p.status, p.created_at, p.expires_at, p.patient_note, c.name as city_name FROM prescriptions p JOIN cities c ON c.id = p.city_id WHERE p.patient_id = $1 AND p.parent_id IS NULL ORDER BY p.created_at DESC`, [user.id]);
  return NextResponse.json({ prescriptions: rows });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const body = await req.json();
    const { cityId, patientNote, items } = body as {
      cityId: string;
      patientNote: string | null;
      items: NewItem[];
    };

    if (!cityId) {
      return NextResponse.json({ error: 'شهر الزامی است' }, { status: 400 });
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'حداقل یک دارو الزامی است' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.name || item.requestedQty < 1) {
        return NextResponse.json(
          { error: 'نام دارو و تعداد معتبر نیست' },
          { status: 400 }
        );
      }
    }

    const trackingCode = `RX-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .substring(2, 6)
      .toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const prescription = await queryOne<{ id: string }>(
      `INSERT INTO prescriptions (patient_id, tracking_code, city_id, status, patient_note, expires_at)
       VALUES ($1, $2, $3, 'PENDING', $4, $5) RETURNING id`,
      [user.id, trackingCode, cityId, patientNote, expiresAt]
    );

    if (!prescription) {
      return NextResponse.json({ error: 'خطا در ثبت نسخه' }, { status: 500 });
    }

    const itemRows = items.map((item) => [
      prescription.id,
      item.name,
      item.requestedQty,
    ]);

    for (const [rxId, name, qty] of itemRows) {
      await query(
        `INSERT INTO prescription_items (prescription_id, name, requested_qty) VALUES ($1, $2, $3)`,
        [rxId, name, qty]
      );
    }

    return NextResponse.json({
      success: true,
      id: prescription.id,
      trackingCode,
    });
  } catch (err) {
    console.error('Create prescription error:', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
