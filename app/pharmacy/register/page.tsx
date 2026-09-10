'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronLeft, ChevronRight, FileUp, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import iranLocations from '@/lib/iran-locations.json';
import { normalizePersianDigits, isValidPostalCode, normalizePostalCode } from '@/lib/persian-utils';
import {
  WeeklyScheduleEditor,
  createDefaultSchedule,
  validateSchedule,
  type DaySchedule,
} from '@/components/weekly-schedule-editor';

const postalCodeSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val) return true;
      return isValidPostalCode(val);
    },
    { message: 'کد پستی باید دقیقاً ۱۰ رقم باشد' }
  );

const schema = z.object({
  mobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست'),
  username: z.string().min(3, 'حداقل ۳ کاراکتر وارد کنید'),
  password: z.string().min(8, 'رمز عبور حداقل ۸ کاراکتر باشد'),
  confirmPassword: z.string(),
  name: z.string().min(2, 'نام داروخانه را وارد کنید'),
  technicalManagerName: z.string().min(2, 'نام مسئول فنی را وارد کنید'),
  technicalManagerNationalId: z.string().min(10, 'کد ملی معتبر وارد کنید'),
  technicalManagerMobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل معتبر نیست'),
  phone: z.string().min(7, 'تلفن ثابت را وارد کنید'),
  licenseNumber: z.string().min(3, 'شماره مجوز را وارد کنید'),
  provinceId: z.string().min(1, 'استان را انتخاب کنید'),
  countyId: z.string().min(1, 'شهرستان را انتخاب کنید'),
  address: z.string().min(10, 'آدرس کامل را وارد کنید'),
  postalCode: postalCodeSchema,
  licenseDocument: z.string().min(1, 'تصویر مجوز را انتخاب کنید'),
  managerDocument: z.string().min(1, 'تصویر کارت مسئول فنی را انتخاب کنید'),
}).refine((v) => v.password === v.confirmPassword, { message: 'تکرار رمز عبور یکسان نیست', path: ['confirmPassword'] });

type PharmacyForm = z.infer<typeof schema>;

const stepFields: Record<number, (keyof PharmacyForm)[]> = {
  1: ['mobile', 'username', 'password', 'confirmPassword'],
  2: ['name', 'licenseNumber', 'technicalManagerName', 'technicalManagerNationalId', 'technicalManagerMobile', 'phone', 'provinceId', 'countyId', 'address', 'postalCode'],
  3: ['licenseDocument', 'managerDocument'],
};

const provinces = iranLocations.provinces as { id: number; name: string }[];
const countiesByProvince = iranLocations.countiesByProvince as Record<string, { id: number; name: string }[]>;

export default function PharmacyRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>(createDefaultSchedule);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, trigger, watch, control, formState: { errors } } = useForm<PharmacyForm>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {} as Partial<PharmacyForm>,
  });

  const selectedProvinceId = watch('provinceId');
  const selectedCountyId = watch('countyId');

  const availableCounties = useMemo(() => {
    if (!selectedProvinceId) return [];
    return countiesByProvince[selectedProvinceId] || [];
  }, [selectedProvinceId]);

  const next = async () => {
    if (step === 2) {
      const scheduleErr = validateSchedule(schedule);
      if (scheduleErr) {
        setScheduleError(scheduleErr);
        return;
      }
      setScheduleError(null);
    }
    if (await trigger(stepFields[step])) setStep((s) => Math.min(3, s + 1));
  };

  const mockUpload = (field: 'licenseDocument' | 'managerDocument', file?: File) => {
    if (file) setValue(field, `mock-s3://${Date.now()}-${file.name}`, { shouldValidate: true });
  };

  const err = (f: keyof PharmacyForm) => errors[f]?.message;

  const submit = async (values: PharmacyForm) => {
    const scheduleErr = validateSchedule(schedule);
    if (scheduleErr) {
      setScheduleError(scheduleErr);
      setStep(2);
      return;
    }

    const province = provinces.find((p) => String(p.id) === values.provinceId);
    const county = availableCounties.find((c) => String(c.id) === values.countyId);

    setSubmitting(true);
    try {
      const payload = {
        ...values,
        postalCode: values.postalCode ? normalizePostalCode(values.postalCode) : null,
        province: province?.name || '',
        county: county?.name || '',
        schedule: schedule.map((day, i) => ({
          dayOfWeek: i,
          is24Hours: day.mode === 'TWENTY_FOUR_HOURS',
          intervals: day.mode === 'WORKING_HOURS' ? day.intervals : [],
        })),
      };
      const res = await fetch('/api/pharmacy/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ثبت‌نام انجام نشد');
      toast.success('درخواست ثبت‌نام شما ارسال شد. پس از تأیید مدیر سیستم می‌توانید وارد شوید.');
      router.push('/auth/login');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ثبت‌نام انجام نشد');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary-600" />
        <h1 className="mt-3 text-2xl font-bold text-text-900">ثبت‌نام داروخانه</h1>
        <p className="mt-2 text-text-600">درخواست شما پس از بررسی مدیر سیستم فعال می‌شود.</p>
      </div>

      <div className="mb-6 flex items-center justify-center gap-2 sm:gap-4">
        {['۱', '۲', '۳'].map((num, i) => {
          const labels = ['اطلاعات حساب', 'اطلاعات داروخانه', 'ساعات کاری و مدارک'];
          const cur = i + 1;
          return (
            <div key={i} className={`flex items-center gap-2 text-sm ${step >= cur ? 'text-primary-700' : 'text-text-500'}`}>
              <span className={`flex h-8 w-8 items-center justify-center rounded-full ${step > cur ? 'bg-primary-600 text-white' : step === cur ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500' : 'bg-background-200'}`}>
                {step > cur ? <Check className="h-4 w-4" /> : num}
              </span>
              <span className="hidden sm:inline">{labels[i]}</span>
              {cur < 3 && <span className="mx-1 h-px w-6 bg-background-300 sm:w-12" />}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(submit)}>
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'اطلاعات حساب' : step === 2 ? 'اطلاعات داروخانه' : 'ساعات کاری و مدارک'}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mobile">شماره موبایل</Label>
                  <Input id="mobile" type="tel" {...register('mobile')} />
                  {err('mobile') && <p className="text-sm text-red-600">{err('mobile')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">نام کاربری</Label>
                  <Input id="username" {...register('username')} />
                  {err('username') && <p className="text-sm text-red-600">{err('username')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور</Label>
                  <Input id="password" type="password" {...register('password')} />
                  {err('password') && <p className="text-sm text-red-600">{err('password')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
                  <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
                  {err('confirmPassword') && <p className="text-sm text-red-600">{err('confirmPassword')}</p>}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">نام داروخانه</Label>
                  <Input id="name" {...register('name')} />
                  {err('name') && <p className="text-sm text-red-600">{err('name')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">شماره مجوز داروخانه</Label>
                  <Input id="licenseNumber" {...register('licenseNumber')} />
                  {err('licenseNumber') && <p className="text-sm text-red-600">{err('licenseNumber')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicalManagerName">نام و نام خانوادگی مسئول فنی</Label>
                  <Input id="technicalManagerName" {...register('technicalManagerName')} />
                  {err('technicalManagerName') && <p className="text-sm text-red-600">{err('technicalManagerName')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicalManagerNationalId">کد ملی مسئول فنی</Label>
                  <Input id="technicalManagerNationalId" {...register('technicalManagerNationalId')} />
                  {err('technicalManagerNationalId') && <p className="text-sm text-red-600">{err('technicalManagerNationalId')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technicalManagerMobile">شماره موبایل مسئول فنی</Label>
                  <Input id="technicalManagerMobile" type="tel" {...register('technicalManagerMobile')} />
                  {err('technicalManagerMobile') && <p className="text-sm text-red-600">{err('technicalManagerMobile')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">تلفن ثابت</Label>
                  <Input id="phone" type="tel" {...register('phone')} />
                  {err('phone') && <p className="text-sm text-red-600">{err('phone')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provinceId">استان</Label>
                  <Controller
                    control={control}
                    name="provinceId"
                    render={({ field }) => (
                      <select
                        id="provinceId"
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          setValue('countyId', '', { shouldValidate: false });
                        }}
                        className="w-full rounded-md border border-background-300 bg-background-50 p-2 text-sm"
                      >
                        <option value="">انتخاب استان</option>
                        {provinces.map((p) => (
                          <option key={p.id} value={String(p.id)}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  {err('provinceId') && <p className="text-sm text-red-600">{err('provinceId')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="countyId">شهرستان</Label>
                  <Controller
                    control={control}
                    name="countyId"
                    render={({ field }) => (
                      <select
                        id="countyId"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                        disabled={!selectedProvinceId}
                        className="w-full rounded-md border border-background-300 bg-background-50 p-2 text-sm disabled:opacity-50"
                      >
                        <option value="">انتخاب شهرستان</option>
                        {availableCounties.map((c) => (
                          <option key={c.id} value={String(c.id)}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  />
                  {err('countyId') && <p className="text-sm text-red-600">{err('countyId')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">کد پستی</Label>
                  <Input
                    id="postalCode"
                    {...register('postalCode', {
                      onChange: (e) => {
                        const normalized = normalizePersianDigits(e.target.value);
                        e.target.value = normalized;
                      },
                    })}
                    maxLength={10}
                  />
                  {err('postalCode') && <p className="text-sm text-red-600">{err('postalCode')}</p>}
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="address">آدرس کامل</Label>
                  <Input id="address" {...register('address')} />
                  {err('address') && <p className="text-sm text-red-600">{err('address')}</p>}
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-6 sm:col-span-2">
                <div>
                  <h3 className="mb-3 text-lg font-bold text-text-900">ساعات کاری هفتگی</h3>
                  <WeeklyScheduleEditor schedule={schedule} onChange={setSchedule} errors={scheduleError} />
                </div>
                <div className="space-y-5">
                  <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-800">
                    مدارک در این نسخه به‌صورت آزمایشی ذخیره می‌شوند و بعداً به فضای ابری متصل خواهند شد.
                  </div>
                  {(['licenseDocument', 'managerDocument'] as const).map((f) => (
                    <div key={f} className="space-y-2">
                      <Label>{f === 'licenseDocument' ? 'تصویر مجوز داروخانه' : 'کارت مسئول فنی'}</Label>
                      <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-background-300 p-5 hover:border-primary-400">
                        <FileUp className="h-6 w-6 text-primary-600" />
                        <span className="text-sm text-text-600">انتخاب فایل تصویر</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => mockUpload(f, e.target.files?.[0])}
                        />
                      </label>
                      {err(f) && <p className="text-sm text-red-600">{err(f)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="mt-5 flex justify-between">
          <Button type="button" variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
            <ChevronRight className="ml-2 h-4 w-4" />
            قبلی
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={next}>
              مرحله بعد
              <ChevronLeft className="mr-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ارسال درخواست'}
            </Button>
          )}
        </div>
      </form>
    </main>
  );
}
