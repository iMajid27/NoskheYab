import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const pharmacies = await query(
    `SELECT p.id, p.name, p.license_number, p.province, p.city_id, p.status, p.created_at,
            p.rejection_reason, p.technical_manager_name, p.technical_manager_national_id,
            p.technical_manager_mobile, p.phone, p.address, p.postal_code, p.working_hours,
            p.owner_id, c.name as city_name
     FROM pharmacies p LEFT JOIN cities c ON p.city_id = c.id
     ORDER BY p.created_at DESC`
  );

  const totalResult = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM prescriptions`);
  const approvedResult = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM pharmacies WHERE status = 'APPROVED'`);
  const pendingResult = await queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM pharmacies WHERE status = 'PENDING_APPROVAL'`);

  return NextResponse.json({
    pharmacies,
    stats: {
      total: parseInt(totalResult?.count || '0'),
      approved: parseInt(approvedResult?.count || '0'),
      pending: parseInt(pendingResult?.count || '0'),
    },
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const { id, status, rejectionReason } = await request.json();
  if (!id || !['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL'].includes(status)) {
    return NextResponse.json({ error: 'درخواست نامعتبر' }, { status: 400 });
  }

  if (status === 'REJECTED' && rejectionReason) {
    await query(
      `UPDATE pharmacies SET status = $1, rejection_reason = $2, updated_at = now() WHERE id = $3`,
      [status, rejectionReason, id]
    );
  } else {
    const clearReason = status === 'APPROVED' ? ', rejection_reason = NULL' : '';
    await query(
      `UPDATE pharmacies SET status = $1${clearReason}, updated_at = now() WHERE id = $2`,
      [status, id]
    );
  }

  return NextResponse.json({ success: true });
}
