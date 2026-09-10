import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction } from '@/lib/db';
import { PoolClient } from 'pg';
import { requireUser } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireUser(req);
    if (!user) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const { responseId } = await req.json();

    if (!responseId) {
      return NextResponse.json({ error: 'پیشنهاد مشخص نیست' }, { status: 400 });
    }

    const response = await queryOne<{
      id: string; status: string; total_price: number | null; pharmacy_id: string; prescription_id: string;
    }>(
      `SELECT id, status, total_price, pharmacy_id, prescription_id FROM pharmacy_responses WHERE id = $1`,
      [responseId]
    );

    if (!response) {
      return NextResponse.json({ error: 'پیشنهاد یافت نشد' }, { status: 404 });
    }

    if (response.status !== 'PUBLISHED') {
      return NextResponse.json({ error: 'این پیشنهاد دیگر فعال نیست' }, { status: 400 });
    }

    const prescription = await queryOne<{ id: string; patient_id: string; status: string; city_id: string }>(
      `SELECT id, patient_id, status, city_id FROM prescriptions WHERE id = $1`,
      [response.prescription_id]
    );

    if (!prescription || prescription.patient_id !== user.id) {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const prescriptionItems = await query<{ id: string; name: string; requested_qty: number }>(
      `SELECT id, name, requested_qty FROM prescription_items WHERE prescription_id = $1`,
      [prescription.id]
    );

    const responseItems = await query<{ prescription_item_id: string; available_qty: number }>(
      `SELECT prescription_item_id, available_qty FROM response_items WHERE pharmacy_response_id = $1`,
      [responseId]
    );

    const missingItems: { name: string; qty: number }[] = [];

    for (const pi of prescriptionItems) {
      const ri = responseItems.find((r) => r.prescription_item_id === pi.id);
      const available = ri?.available_qty || 0;
      const missing = pi.requested_qty - available;
      if (missing > 0) {
        missingItems.push({ name: pi.name, qty: missing });
      }
    }

    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `UPDATE pharmacy_responses SET status = 'ACCEPTED', updated_at = now() WHERE id = $1`,
        [responseId]
      );

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const orderResult = await client.query(
        `INSERT INTO orders (pharmacy_response_id, patient_id, amount, status, expires_at)
         VALUES ($1, $2, $3, 'AWAITING_PAYMENT', $4) RETURNING id`,
        [responseId, user.id, response.total_price || 0, expiresAt]
      );
      const orderId = orderResult.rows[0].id;

      const newStatus = missingItems.length > 0 ? 'PARTIAL_ACCEPTED' : 'FULLY_ACCEPTED';
      await client.query(
        `UPDATE prescriptions SET status = $1 WHERE id = $2`,
        [newStatus, prescription.id]
      );

      if (missingItems.length > 0) {
        const childTrackingCode = `RX-CHILD-${Date.now().toString(36).toUpperCase()}-${Math.random()
          .toString(36)
          .substring(2, 6)
          .toUpperCase()}`;
        const childExpiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

        const childResult = await client.query(
          `INSERT INTO prescriptions (patient_id, tracking_code, city_id, status, parent_id, expires_at)
           VALUES ($1, $2, $3, 'PENDING', $4, $5) RETURNING id`,
          [prescription.patient_id, childTrackingCode, prescription.city_id, prescription.id, childExpiresAt]
        );
        const childId = childResult.rows[0].id;

        for (const mi of missingItems) {
          await client.query(
            `INSERT INTO prescription_items (prescription_id, name, requested_qty) VALUES ($1, $2, $3)`,
            [childId, mi.name, mi.qty]
          );
        }
      }

      return orderId;
    });

    return NextResponse.json({
      success: true,
      cascading: missingItems.length > 0,
      missingCount: missingItems.length,
    });
  } catch (err) {
    console.error('Accept offer error:', err);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
