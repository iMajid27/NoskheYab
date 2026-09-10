import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireUser } from '@/lib/auth';

interface ResponseItemInput {
  prescriptionItemId: string;
  medicineName: string;
  availableQty: number;
  unitPrice: number;
}

export async function GET(req: NextRequest) {
  const user = await requireUser(req);
  if (!user || !['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(user.role)) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  const pharmacy = await queryOne<{id:string;name:string;city_id:string;status:string;city_name:string}>(`SELECT p.id,p.name,p.city_id,p.status,c.name as city_name FROM pharmacies p JOIN cities c ON c.id=p.city_id WHERE p.owner_id=$1`, [user.id]);
  if (!pharmacy) return NextResponse.json({ pharmacy:null, prescriptions:[] });
  const prescriptions = pharmacy.status === 'APPROVED' ? await query(`SELECT p.id,p.tracking_code,p.status,p.created_at,p.expires_at,p.patient_note,c.name as city_name FROM prescriptions p JOIN cities c ON c.id=p.city_id WHERE p.city_id=$1 AND p.status IN ('PENDING','HAS_OFFERS') ORDER BY p.created_at DESC`, [pharmacy.city_id]) : [];
  return NextResponse.json({ pharmacy, prescriptions });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    if (!['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(user.role)) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const pharmacy = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM pharmacies WHERE owner_id = $1`,
      [user.id]
    );

    if (!pharmacy || pharmacy.status !== 'APPROVED') {
      return NextResponse.json({ error: 'داروخانه فعال نیست' }, { status: 403 });
    }

    const body = await req.json();
    const {
      prescriptionId,
      pharmacyId,
      pharmacistNote,
      generatedNote,
      totalPrice,
      items,
    } = body as {
      prescriptionId: string;
      pharmacyId: string;
      pharmacistNote: string | null;
      generatedNote: string;
      totalPrice: number;
      items: ResponseItemInput[];
    };

    if (!prescriptionId || !items || items.length === 0) {
      return NextResponse.json({ error: 'اطلاعات ناقص' }, { status: 400 });
    }

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM pharmacy_responses WHERE pharmacy_id = $1 AND prescription_id = $2`,
      [pharmacy.id, prescriptionId]
    );

    let responseId: string;

    if (existing) {
      await query(
        `UPDATE pharmacy_responses
         SET pharmacist_note = $1, generated_note = $2, total_price = $3, status = 'PUBLISHED', updated_at = now()
         WHERE id = $4`,
        [pharmacistNote, generatedNote, totalPrice, existing.id]
      );
      responseId = existing.id;

      await query(`DELETE FROM response_items WHERE pharmacy_response_id = $1`, [responseId]);
    } else {
      const newResponse = await queryOne<{ id: string }>(
        `INSERT INTO pharmacy_responses (pharmacy_id, prescription_id, status, pharmacist_note, generated_note, total_price)
         VALUES ($1, $2, 'PUBLISHED', $3, $4, $5) RETURNING id`,
        [pharmacy.id, prescriptionId, pharmacistNote, generatedNote, totalPrice]
      );

      if (!newResponse) {
        return NextResponse.json({ error: 'خطا در ثبت پاسخ' }, { status: 500 });
      }
      responseId = newResponse.id;
    }

    const validItems = items.filter((i) => i.availableQty > 0);

    for (const item of validItems) {
      await query(
        `INSERT INTO response_items (pharmacy_response_id, prescription_item_id, medicine_name, available_qty, unit_price)
         VALUES ($1, $2, $3, $4, $5)`,
        [responseId, item.prescriptionItemId, item.medicineName, item.availableQty, item.unitPrice]
      );
    }

    await query(
      `UPDATE prescriptions SET status = 'HAS_OFFERS' WHERE id = $1 AND status IN ('PENDING', 'UNDER_REVIEW')`,
      [prescriptionId]
    );

    return NextResponse.json({ success: true, responseId });
  } catch (err) {
    console.error('Pharmacy response error:', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
