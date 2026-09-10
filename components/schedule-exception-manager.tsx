'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { isValidJalaaliDate } from 'jalaali-js';

type ExceptionStatus = 'CLOSED' | 'SPECIAL_HOURS' | 'TWENTY_FOUR_HOURS';
type ExceptionInterval = { opensAt: string; closesAt: string };
type Exception = {
  id: string;
  jalali_date: string;
  status: ExceptionStatus;
  note: string | null;
  hours: ExceptionInterval[];
};

const STATUS_LABELS: Record<ExceptionStatus, string> = {
  CLOSED: 'تعطیل',
  SPECIAL_HOURS: 'ساعات ویژه',
  TWENTY_FOUR_HOURS: 'شبانه‌روزی',
};

function isValidJalaliDate(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return false;
  const [, jy, jm, jd] = match;
  return isValidJalaaliDate(parseInt(jy), parseInt(jm), parseInt(jd));
}

function validateTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

interface ScheduleExceptionManagerProps {
  pharmacyId: string;
  token: string;
}

export function ScheduleExceptionManager({ pharmacyId, token }: ScheduleExceptionManagerProps) {
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dateInput, setDateInput] = useState('');
  const [status, setStatus] = useState<ExceptionStatus>('CLOSED');
  const [note, setNote] = useState('');
  const [intervals, setIntervals] = useState<ExceptionInterval[]>([{ opensAt: '09:00', closesAt: '14:00' }]);

  useEffect(() => {
    loadExceptions();
  }, []);

  const loadExceptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pharmacy/schedule?pharmacyId=${pharmacyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExceptions(data.exceptions || []);
      }
    } catch {
      toast.error('خطا در بارگذاری استثنائات');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDateInput('');
    setStatus('CLOSED');
    setNote('');
    setIntervals([{ opensAt: '09:00', closesAt: '14:00' }]);
  };

  const handleSave = async () => {
    if (!isValidJalaliDate(dateInput)) {
      toast.error('تاریخ jalali معتبر وارد کنید (مثال: 1405/07/05)');
      return;
    }

    if (status === 'SPECIAL_HOURS') {
      for (const interval of intervals) {
        if (!validateTime(interval.opensAt) || !validateTime(interval.closesAt)) {
          toast.error('زمان‌ها باید با فرمت HH:mm وارد شوند');
          return;
        }
        if (interval.opensAt >= interval.closesAt) {
          toast.error('زمان شروع باید قبل از زمان پایان باشد');
          return;
        }
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/pharmacy/schedule', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacyId,
          jalaliDate: dateInput,
          status,
          note: note || null,
          intervals: status === 'SPECIAL_HOURS' ? intervals : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('استثنا با موفقیت ذخیره شد');
      resetForm();
      setShowForm(false);
      loadExceptions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره استثنا');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (exceptionId: string) => {
    try {
      const res = await fetch(`/api/pharmacy/schedule?pharmacyId=${pharmacyId}&exceptionId=${exceptionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('خطا در حذف');
      toast.success('استثنا حذف شد');
      loadExceptions();
    } catch {
      toast.error('حذف انجام نشد');
    }
  };

  const updateInterval = (index: number, field: 'opensAt' | 'closesAt', value: string) => {
    setIntervals((prev) => prev.map((interval, i) => (i === index ? { ...interval, [field]: value } : interval)));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary-600" />
            استثنائات ساعات کاری
          </CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="ml-1 h-4 w-4" />
            افزودن استثنا
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-4 rounded-lg border border-background-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>تاریخ (jalali)</Label>
                <Input
                  placeholder="1405/07/05"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع استثنا</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ExceptionStatus)}
                  className="w-full rounded-md border border-background-300 bg-background-50 p-2 text-sm"
                >
                  <option value="CLOSED">{STATUS_LABELS.CLOSED}</option>
                  <option value="SPECIAL_HOURS">{STATUS_LABELS.SPECIAL_HOURS}</option>
                  <option value="TWENTY_FOUR_HOURS">{STATUS_LABELS.TWENTY_FOUR_HOURS}</option>
                </select>
              </div>
            </div>

            {status === 'SPECIAL_HOURS' && (
              <div className="space-y-2">
                <Label>بازه‌های زمانی</Label>
                {intervals.map((interval, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-text-500" />
                    <Input
                      type="time"
                      value={interval.opensAt}
                      onChange={(e) => updateInterval(i, 'opensAt', e.target.value)}
                      className="w-32"
                    />
                    <span className="text-text-500">→</span>
                    <Input
                      type="time"
                      value={interval.closesAt}
                      onChange={(e) => updateInterval(i, 'closesAt', e.target.value)}
                      className="w-32"
                    />
                    {intervals.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setIntervals((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIntervals((prev) => [...prev, { opensAt: '16:00', closesAt: '20:00' }])}
                >
                  <Plus className="ml-1 h-4 w-4" />
                  افزودن بازه
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>یادداشت (اختیاری)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: تعطیلی نوروزی" />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره استثنا'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
                انصراف
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
          </div>
        ) : exceptions.length === 0 ? (
          <p className="py-8 text-center text-text-600">استثنائاتی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {exceptions.map((exc) => (
              <div key={exc.id} className="flex items-center justify-between rounded-lg border border-background-200 p-3">
                <div>
                  <p className="font-medium" dir="ltr">{exc.jalali_date}</p>
                  <p className="text-sm text-text-600">
                    {STATUS_LABELS[exc.status]}
                    {exc.hours.length > 0 && ` — ${exc.hours.map((h) => `${h.opensAt}-${h.closesAt}`).join('، ')}`}
                  </p>
                  {exc.note && <p className="text-xs text-text-500">{exc.note}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(exc.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
