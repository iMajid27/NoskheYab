import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { normalizePhone } from '@/lib/persian-utils';
import { generateOtp, getOtpDeliveryProvider } from '@/lib/otp-provider';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: string };
    const phone = normalizePhone(body.phone || '');

    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
    }

    const recent = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM otp_codes WHERE phone = $1 AND created_at > now() - interval '10 minutes'`,
      [phone]
    );
    if (Number(recent?.count || 0) >= 3) {
      return NextResponse.json({ error: 'تعداد درخواست‌های شما بیش از حد مجاز است. بعداً دوباره تلاش کنید.' }, { status: 429 });
    }

    const cooldown = await queryOne<{ id: string }>(
      `SELECT id FROM otp_codes WHERE phone = $1 AND created_at > now() - interval '60 seconds' LIMIT 1`,
      [phone]
    );
    if (cooldown) {
      return NextResponse.json({ error: 'لطفاً یک دقیقه قبل از درخواست دوباره صبر کنید.' }, { status: 429 });
    }

    await query(`UPDATE otp_codes SET used = true WHERE phone = $1 AND used = false`, [phone]);
    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);
    await query(`INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3)`, [phone, code, expiresAt.toISOString()]);
    await getOtpDeliveryProvider().deliver(phone, code, expiresAt);

    return NextResponse.json({ success: true, message: 'کد تأیید ارسال شد' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
