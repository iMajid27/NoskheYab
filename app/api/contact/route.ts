import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { normalizePhone } from '@/lib/persian-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { name?: string; phone?: string; message?: string };
    const name = body.name?.trim() || '';
    const phone = normalizePhone(body.phone || '');
    const message = body.message?.trim() || '';

    if (name.length < 2 || name.length > 100) {
      return NextResponse.json({ error: 'نام باید بین ۲ تا ۱۰۰ کاراکتر باشد' }, { status: 400 });
    }
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
    }
    if (message.length < 5 || message.length > 2000) {
      return NextResponse.json({ error: 'پیام باید بین ۵ تا ۲۰۰۰ کاراکتر باشد' }, { status: 400 });
    }

    await query(
      `INSERT INTO contact_messages (name, phone, message) VALUES ($1, $2, $3)`,
      [name, phone, message]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact message error:', error);
    return NextResponse.json({ error: 'ارسال پیام انجام نشد' }, { status: 500 });
  }
}
