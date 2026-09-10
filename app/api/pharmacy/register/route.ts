import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction } from '@/lib/db';
import { PoolClient } from 'pg';
import { hashPassword } from '@/lib/auth';
import { normalizePersianDigits, normalizePostalCode, isValidPostalCode } from '@/lib/persian-utils';

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mobile = normalizePersianDigits(typeof body.mobile === 'string' ? body.mobile : '');
    const technicalManagerMobile = normalizePersianDigits(typeof body.technicalManagerMobile === 'string' ? body.technicalManagerMobile : '');
    const technicalManagerNationalId = normalizePersianDigits(typeof body.technicalManagerNationalId === 'string' ? body.technicalManagerNationalId : '');
    const phone = normalizePersianDigits(typeof body.phone === 'string' ? body.phone : '');
    const required = ['mobile', 'username', 'password', 'confirmPassword', 'name', 'technicalManagerName', 'technicalManagerNationalId', 'technicalManagerMobile', 'phone', 'licenseNumber', 'provinceId', 'countyId', 'address', 'licenseDocument', 'managerDocument'];
    if (required.some((key) => typeof body[key] !== 'string' || !body[key].trim())) {
      return NextResponse.json({ error: 'لطفاً همه اطلاعات الزامی را کامل کنید' }, { status: 400 });
    }
    if (!/^09\d{9}$/.test(mobile) || !/^09\d{9}$/.test(technicalManagerMobile)) {
      return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
    }
    if (body.password.length < 8 || body.password !== body.confirmPassword) {
      return NextResponse.json({ error: 'رمز عبور معتبر نیست' }, { status: 400 });
    }

    // Postal code validation (if provided)
    let postalCode: string | null = null;
    if (body.postalCode && typeof body.postalCode === 'string' && body.postalCode.trim()) {
      const normalized = normalizePostalCode(body.postalCode);
      if (!isValidPostalCode(normalized)) {
        return NextResponse.json({ error: 'کد پستی باید دقیقاً ۱۰ رقم باشد' }, { status: 400 });
      }
      postalCode = normalized;
    }

    // Validate schedule
    const schedule = body.schedule;
    if (Array.isArray(schedule)) {
      for (const day of schedule) {
        if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
          return NextResponse.json({ error: 'روز هفته معتبر نیست' }, { status: 400 });
        }
        if (!day.is24Hours) {
          for (const interval of (day.intervals || [])) {
            if (!isValidTime(interval.opensAt) || !isValidTime(interval.closesAt)) {
              return NextResponse.json({ error: 'زمان‌ها باید با فرمت HH:mm باشند' }, { status: 400 });
            }
            if (interval.opensAt >= interval.closesAt) {
              return NextResponse.json({ error: 'زمان شروع باید قبل از پایان باشد' }, { status: 400 });
            }
          }
        }
      }
    }

    // Check for duplicate phone or username
    const duplicate = await queryOne(
      `SELECT id FROM users WHERE phone = $1 OR username = $2`,
      [mobile, body.username.trim()]
    );
    if (duplicate) {
      return NextResponse.json({ error: 'این شماره موبایل یا نام کاربری قبلاً ثبت شده است' }, { status: 409 });
    }

    // Check for duplicate license number
    const licenseDup = await queryOne(
      `SELECT id FROM pharmacies WHERE license_number = $1`,
      [body.licenseNumber.trim()]
    );
    if (licenseDup) {
      return NextResponse.json({ error: 'این شماره مجوز قبلاً ثبت شده است' }, { status: 409 });
    }

    const provinceName = typeof body.province === 'string' ? body.province.trim() : '';
    const countyName = typeof body.county === 'string' ? body.county.trim() : '';
    const countyId = parseInt(body.countyId);

    if (!provinceName || !countyName || isNaN(countyId)) {
      return NextResponse.json({ error: 'استان و شهرستان معتبر نیست' }, { status: 400 });
    }

    const passwordHash = await hashPassword(body.password);

    const result = await withTransaction(async (client: PoolClient) => {
      const userResult = await client.query(
        `INSERT INTO users (phone, username, password_hash, role) VALUES ($1, $2, $3, 'PHARMACY_ADMIN') RETURNING id`,
        [body.mobile, body.username.trim(), passwordHash]
      );
      const userId = userResult.rows[0].id;

      const pharmResult = await client.query(
        `INSERT INTO pharmacies (owner_id, name, license_number, city_id, province, county_id, county_name, technical_manager_name, technical_manager_national_id, technical_manager_mobile, phone, address, postal_code, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'PENDING_APPROVAL')
         RETURNING id`,
        [
          userId,
          body.name.trim(),
          body.licenseNumber.trim(),
          null,
          provinceName,
          countyId,
          countyName,
          body.technicalManagerName.trim(),
          technicalManagerNationalId,
          technicalManagerMobile,
          phone,
          body.address.trim(),
          postalCode,
        ]
      );
      const pharmacyId = pharmResult.rows[0].id;

      // Insert documents
      await client.query(
        `INSERT INTO pharmacy_documents (pharmacy_id, document_type, object_key) VALUES ($1, 'LICENSE', $2), ($1, 'TECHNICAL_MANAGER_ID', $3)`,
        [pharmacyId, body.licenseDocument, body.managerDocument]
      );

      // Insert weekly schedule
      if (Array.isArray(schedule)) {
        for (const day of schedule) {
          if (day.is24Hours) {
            await client.query(
              `INSERT INTO pharmacy_opening_hours (pharmacy_id, day_of_week, opens_at, closes_at, is_24_hours) VALUES ($1, $2, '00:00', '23:59', true)`,
              [pharmacyId, day.dayOfWeek]
            );
          } else {
            for (const interval of (day.intervals || [])) {
              await client.query(
                `INSERT INTO pharmacy_opening_hours (pharmacy_id, day_of_week, opens_at, closes_at, is_24_hours) VALUES ($1, $2, $3, $4, false)`,
                [pharmacyId, day.dayOfWeek, interval.opensAt, interval.closesAt]
              );
            }
          }
        }
      }

      return { userId, pharmacyId };
    });

    return NextResponse.json({ success: true, pharmacyId: result.pharmacyId });
  } catch (error) {
    console.error('Pharmacy registration error:', error);
    return NextResponse.json({ error: 'ثبت‌نام داروخانه انجام نشد' }, { status: 500 });
  }
}
