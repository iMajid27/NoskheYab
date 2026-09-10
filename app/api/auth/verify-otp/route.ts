import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { signToken, hashPassword, AuthUser } from '@/lib/auth';
import { normalizePhone, toEnglishDigits } from '@/lib/persian-utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: string; otp?: string; password?: string };
    const phone = normalizePhone(body.phone || '');
    const otp = toEnglishDigits(body.otp || '');

    if (!/^09\d{9}$/.test(phone) || !/^\d{5}$/.test(otp)) {
      return NextResponse.json({ error: 'شماره موبایل و کد تأیید معتبر الزامی است' }, { status: 400 });
    }

    const otpRecord = await queryOne<{ id: string; code: string; expires_at: string }>(
      `SELECT id, code, expires_at FROM otp_codes WHERE phone = $1 AND used = false ORDER BY created_at DESC LIMIT 1`,
      [phone]
    );
    if (!otpRecord) return NextResponse.json({ error: 'کد تأیید یافت نشد. دوباره درخواست کنید.' }, { status: 400 });
    if (new Date(otpRecord.expires_at) < new Date()) return NextResponse.json({ error: 'کد تأیید منقضی شده است' }, { status: 400 });
    if (otpRecord.code !== otp) return NextResponse.json({ error: 'کد تأیید اشتباه است' }, { status: 400 });

    const updated = await query(
      `UPDATE otp_codes SET used = true WHERE id = $1 AND used = false RETURNING id`,
      [otpRecord.id]
    );
    if (updated.length === 0) return NextResponse.json({ error: 'کد تأیید قبلاً استفاده شده است' }, { status: 400 });

    let user = await queryOne<AuthUser>(`SELECT id, phone, role, username FROM users WHERE phone = $1`, [phone]);
    if (!user) {
      const pwdHash = body.password ? await hashPassword(body.password) : null;
      user = await queryOne<AuthUser>(
        `INSERT INTO users (phone, password_hash, role) VALUES ($1, $2, 'PATIENT') RETURNING id, phone, role, username`,
        [phone, pwdHash]
      );
    }
    if (!user) return NextResponse.json({ error: 'خطا در ایجاد حساب کاربری' }, { status: 500 });

    if (body.password && user.role !== 'PATIENT') {
      const pwdHash = await hashPassword(body.password);
      await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [pwdHash, user.id]);
    }

    const token = signToken({ id: user.id, phone: user.phone, role: user.role, username: user.username });
    return NextResponse.json({ success: true, token, user: { id: user.id, phone: user.phone, role: user.role, username: user.username } });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
