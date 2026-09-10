'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, FileText, MapPin, Clock } from 'lucide-react';
import { ScheduleExceptionManager } from '@/components/schedule-exception-manager';
import { WeeklyScheduleEditor, createDefaultSchedule, validateSchedule, type DaySchedule } from '@/components/weekly-schedule-editor';
import { toast } from 'sonner';

export default function PharmacyDashboard() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const [pharmacy, setPharmacy] = useState<{ id: string; name: string; city_name: string; status: string } | null>(null);
  const [items, setItems] = useState<{ id: string; tracking_code: string; created_at: string; patient_note: string | null }[]>([]);
  const [busy, setBusy] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState<DaySchedule[]>(createDefaultSchedule);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(user.role))) router.push('/auth/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!token) return;
    fetch('/api/pharmacy-responses', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { setPharmacy(d.pharmacy); setItems(d.prescriptions || []); })
      .finally(() => setBusy(false));
  }, [token]);

  const loadSchedule = async () => {
    if (!token || !pharmacy) return;
    const res = await fetch(`/api/pharmacy/schedule?pharmacyId=${pharmacy.id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const data = await res.json();
    const weeklyHours = data.weeklyHours || [];
    const newSchedule = createDefaultSchedule();
    for (let i = 0; i < 7; i++) {
      const dayHours = weeklyHours.filter((h: { day_of_week: number }) => h.day_of_week === i);
      if (dayHours.length === 0) {
        newSchedule[i] = { mode: 'CLOSED', intervals: [] };
      } else if (dayHours[0].is_24_hours) {
        newSchedule[i] = { mode: 'TWENTY_FOUR_HOURS', intervals: [] };
      } else {
        newSchedule[i] = {
          mode: 'WORKING_HOURS',
          intervals: dayHours.map((h: { opens_at: string; closes_at: string }) => ({ opensAt: h.opens_at, closesAt: h.closes_at })),
        };
      }
    }
    setSchedule(newSchedule);
  };

  const saveSchedule = async () => {
    if (!pharmacy || !token) return;
    const scheduleErr = validateSchedule(schedule);
    if (scheduleErr) { setScheduleError(scheduleErr); return; }
    setScheduleError(null);
    setSavingSchedule(true);
    try {
      const res = await fetch('/api/pharmacy/schedule', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId: pharmacy.id,
          schedule: schedule.map((day, i) => ({
            dayOfWeek: i,
            is24Hours: day.mode === 'TWENTY_FOUR_HOURS',
            intervals: day.mode === 'WORKING_HOURS' ? day.intervals : [],
          })),
        }),
      });
      if (!res.ok) throw new Error('خطا در ذخیره');
      toast.success('ساعات کاری به‌روزرسانی شد');
    } catch {
      toast.error('ذخیره ساعات کاری انجام نشد');
    } finally {
      setSavingSchedule(false);
    }
  };

  if (loading || !user) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;
  if (!busy && !pharmacy) return <Card className="mx-auto mt-16 max-w-3xl"><CardContent className="flex flex-col items-center py-16"><MapPin className="h-12 w-12 text-background-400" /><p className="mt-4 text-lg">داروخانه‌ای به حساب شما متصل نیست</p></CardContent></Card>;
  if (!busy && pharmacy && pharmacy.status !== 'APPROVED') return <Card className="mx-auto mt-16 max-w-3xl"><CardContent className="flex flex-col items-center py-16"><FileText className="h-12 w-12 text-background-400" /><p className="mt-4 text-lg">داروخانه شما در انتظار تأیید است</p></CardContent></Card>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">پنل داروخانه</h1>
          <p className="mt-1 text-sm text-background-600">{pharmacy?.name} - {pharmacy?.city_name}</p>
        </div>
        <Button variant="ghost" onClick={() => { logout(); router.push('/'); }}>
          <LogOut className="ml-2 h-4 w-4" />خروج
        </Button>
      </div>

      <div className="mt-6">
        <Button variant="outline" onClick={() => { setShowSchedule(!showSchedule); if (!showSchedule) loadSchedule(); }}>
          <Clock className="ml-2 h-4 w-4" />
          {showSchedule ? 'بستن ساعات کاری' : 'مدیریت ساعات کاری'}
        </Button>
      </div>

      {showSchedule && pharmacy && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-bold">ساعات کاری هفتگی</h3>
              <WeeklyScheduleEditor schedule={schedule} onChange={setSchedule} errors={scheduleError} />
              <div className="mt-4">
                <Button onClick={saveSchedule} disabled={savingSchedule}>
                  {savingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره ساعات کاری'}
                </Button>
              </div>
            </CardContent>
          </Card>
          <ScheduleExceptionManager pharmacyId={pharmacy.id} token={token || ''} />
        </div>
      )}

      <h2 className="mt-8 mb-4 text-lg font-bold">نسخه‌های ورودی ({items.length})</h2>
      {busy ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-600" /> : items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16">
            <FileText className="h-12 w-12 text-background-400" />
            <p className="mt-4">نسخه جدیدی موجود نیست</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((rx) => (
            <Card key={rx.id} className="cursor-pointer hover:border-primary-300" onClick={() => router.push(`/pharmacy/prescriptions/${rx.id}`)}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="font-semibold" dir="ltr">{rx.tracking_code}</p>
                  {rx.patient_note && <p className="text-sm text-background-600">{rx.patient_note}</p>}
                </div>
                <Badge variant="secondary">در انتظار پاسخ</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
