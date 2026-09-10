import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne, withTransaction } from '@/lib/db';
import { PoolClient } from 'pg';
import { requirePharmacy } from '@/lib/auth';
import { isValidJalaaliDate } from 'jalaali-js';

export const dynamic = 'force-dynamic';

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function isValidJalaliDate(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;
  const [, jy, jm, jd] = match;
  return isValidJalaaliDate(parseInt(jy), parseInt(jm), parseInt(jd));
}

async function getPharmacyForUser(userId: string): Promise<{ id: string } | null> {
  return queryOne<{ id: string }>(`SELECT id FROM pharmacies WHERE owner_id = $1`, [userId]);
}

export async function GET(request: NextRequest) {
  const user = await requirePharmacy(request);
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const pharmacyId = request.nextUrl.searchParams.get('pharmacyId');
  if (!pharmacyId) return NextResponse.json({ error: 'شناسه داروخانه الزامی است' }, { status: 400 });

  const pharmacy = await getPharmacyForUser(user.id);
  if (!pharmacy || pharmacy.id !== pharmacyId) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  const exceptions = await query(
    `SELECT id, jalali_date, status, note FROM pharmacy_schedule_exceptions WHERE pharmacy_id = $1 ORDER BY jalali_date`,
    [pharmacyId]
  );

  const result = [];
  for (const exc of exceptions) {
    const hours = await query(
      `SELECT opens_at, closes_at FROM pharmacy_schedule_exception_hours WHERE exception_id = $1`,
      [exc.id]
    );
    result.push({
      id: exc.id,
      jalali_date: exc.jalali_date,
      status: exc.status,
      note: exc.note,
      hours: hours.map((h) => ({ opensAt: h.opens_at, closesAt: h.closes_at })),
    });
  }

  const weeklyHours = await query(
    `SELECT day_of_week, opens_at, closes_at, is_24_hours FROM pharmacy_opening_hours WHERE pharmacy_id = $1 ORDER BY day_of_week, opens_at`,
    [pharmacyId]
  );

  return NextResponse.json({ exceptions: result, weeklyHours });
}

export async function POST(request: NextRequest) {
  const user = await requirePharmacy(request);
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const body = await request.json();
  const { pharmacyId, jalaliDate, status, note, intervals } = body as {
    pharmacyId: string;
    jalaliDate: string;
    status: string;
    note: string | null;
    intervals: { opensAt: string; closesAt: string }[];
  };

  if (!pharmacyId || !jalaliDate || !status) {
    return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
  }

  const pharmacy = await getPharmacyForUser(user.id);
  if (!pharmacy || pharmacy.id !== pharmacyId) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  if (!isValidJalaliDate(jalaliDate)) {
    return NextResponse.json({ error: 'تاریخ jalali معتبر نیست' }, { status: 400 });
  }

  if (!['CLOSED', 'SPECIAL_HOURS', 'TWENTY_FOUR_HOURS'].includes(status)) {
    return NextResponse.json({ error: 'نوع استثنا معتبر نیست' }, { status: 400 });
  }

  if (status === 'SPECIAL_HOURS') {
    if (!intervals || intervals.length === 0) {
      return NextResponse.json({ error: 'حداقل یک بازه زمانی لازم است' }, { status: 400 });
    }
    for (const interval of intervals) {
      if (!isValidTime(interval.opensAt) || !isValidTime(interval.closesAt)) {
        return NextResponse.json({ error: 'زمان‌ها باید با فرمت HH:mm باشند' }, { status: 400 });
      }
      if (interval.opensAt >= interval.closesAt) {
        return NextResponse.json({ error: 'زمان شروع باید قبل از پایان باشد' }, { status: 400 });
      }
    }
    for (let a = 0; a < intervals.length; a++) {
      for (let b = a + 1; b < intervals.length; b++) {
        if (intervals[a].opensAt < intervals[b].closesAt && intervals[b].opensAt < intervals[a].closesAt) {
          return NextResponse.json({ error: 'بازه‌های زمانی نمی‌توانند هم‌پوشانی داشته باشند' }, { status: 400 });
        }
      }
    }
  }

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM pharmacy_schedule_exceptions WHERE pharmacy_id = $1 AND jalali_date = $2`,
    [pharmacyId, jalaliDate]
  );

  try {
    await withTransaction(async (client: PoolClient) => {
      let exceptionId: string;

      if (existing) {
        await client.query(`DELETE FROM pharmacy_schedule_exception_hours WHERE exception_id = $1`, [existing.id]);
        await client.query(
          `UPDATE pharmacy_schedule_exceptions SET status = $1, note = $2 WHERE id = $3`,
          [status, note, existing.id]
        );
        exceptionId = existing.id;
      } else {
        const result = await client.query(
          `INSERT INTO pharmacy_schedule_exceptions (pharmacy_id, jalali_date, status, note) VALUES ($1, $2, $3, $4) RETURNING id`,
          [pharmacyId, jalaliDate, status, note]
        );
        exceptionId = result.rows[0].id;
      }

      if (status === 'SPECIAL_HOURS') {
        for (const interval of intervals) {
          await client.query(
            `INSERT INTO pharmacy_schedule_exception_hours (exception_id, opens_at, closes_at) VALUES ($1, $2, $3)`,
            [exceptionId, interval.opensAt, interval.closesAt]
          );
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule exception save error:', error);
    return NextResponse.json({ error: 'خطا در ذخیره استثنا' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await requirePharmacy(request);
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const body = await request.json();
  const { pharmacyId, schedule } = body as {
    pharmacyId: string;
    schedule: { dayOfWeek: number; intervals: { opensAt: string; closesAt: string }[]; is24Hours: boolean }[];
  };

  if (!pharmacyId || !schedule) {
    return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
  }

  const pharmacy = await getPharmacyForUser(user.id);
  if (!pharmacy || pharmacy.id !== pharmacyId) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  for (const day of schedule) {
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      return NextResponse.json({ error: 'روز هفته معتبر نیست' }, { status: 400 });
    }
    if (!day.is24Hours) {
      for (const interval of day.intervals) {
        if (!isValidTime(interval.opensAt) || !isValidTime(interval.closesAt)) {
          return NextResponse.json({ error: 'زمان‌ها باید با فرمت HH:mm باشند' }, { status: 400 });
        }
        if (interval.opensAt >= interval.closesAt) {
          return NextResponse.json({ error: 'زمان شروع باید قبل از پایان باشد' }, { status: 400 });
        }
      }
      for (let a = 0; a < day.intervals.length; a++) {
        for (let b = a + 1; b < day.intervals.length; b++) {
          if (day.intervals[a].opensAt < day.intervals[b].closesAt && day.intervals[b].opensAt < day.intervals[a].closesAt) {
            return NextResponse.json({ error: 'بازه‌های زمانی هم‌پوشانی دارند' }, { status: 400 });
          }
        }
      }
    }
  }

  try {
    await withTransaction(async (client: PoolClient) => {
      await client.query(`DELETE FROM pharmacy_opening_hours WHERE pharmacy_id = $1`, [pharmacyId]);

      for (const day of schedule) {
        if (day.is24Hours) {
          await client.query(
            `INSERT INTO pharmacy_opening_hours (pharmacy_id, day_of_week, opens_at, closes_at, is_24_hours) VALUES ($1, $2, '00:00', '23:59', true)`,
            [pharmacyId, day.dayOfWeek]
          );
        } else {
          for (const interval of day.intervals) {
            await client.query(
              `INSERT INTO pharmacy_opening_hours (pharmacy_id, day_of_week, opens_at, closes_at, is_24_hours) VALUES ($1, $2, $3, $4, false)`,
              [pharmacyId, day.dayOfWeek, interval.opensAt, interval.closesAt]
            );
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Weekly schedule save error:', error);
    return NextResponse.json({ error: 'خطا در ذخیره ساعات کاری' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requirePharmacy(request);
  if (!user) return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });

  const pharmacyId = request.nextUrl.searchParams.get('pharmacyId');
  const exceptionId = request.nextUrl.searchParams.get('exceptionId');

  if (!pharmacyId || !exceptionId) {
    return NextResponse.json({ error: 'شناسه الزامی است' }, { status: 400 });
  }

  const pharmacy = await getPharmacyForUser(user.id);
  if (!pharmacy || pharmacy.id !== pharmacyId) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
  }

  await query(`DELETE FROM pharmacy_schedule_exceptions WHERE id = $1 AND pharmacy_id = $2`, [exceptionId, pharmacyId]);

  return NextResponse.json({ success: true });
}
