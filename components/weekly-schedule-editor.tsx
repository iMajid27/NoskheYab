'use client';

import { Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type DayMode = 'CLOSED' | 'WORKING_HOURS' | 'TWENTY_FOUR_HOURS';
export type TimeInterval = { opensAt: string; closesAt: string };
export type DaySchedule = { mode: DayMode; intervals: TimeInterval[] };

export const PERSIAN_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

const MODE_LABELS: Record<DayMode, string> = {
  CLOSED: 'تعطیل',
  WORKING_HOURS: 'ساعات کاری',
  TWENTY_FOUR_HOURS: 'شبانه‌روزی',
};

function validateTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return a.opensAt < b.closesAt && b.opensAt < a.closesAt;
}

export function createDefaultSchedule(): DaySchedule[] {
  return PERSIAN_DAYS.map(() => ({ mode: 'WORKING_HOURS' as DayMode, intervals: [{ opensAt: '08:00', closesAt: '22:00' }] }));
}

export function validateSchedule(schedule: DaySchedule[]): string | null {
  for (let i = 0; i < schedule.length; i++) {
    const day = schedule[i];
    if (day.mode === 'WORKING_HOURS') {
      if (day.intervals.length === 0) return `${PERSIAN_DAYS[i]}: حداقل یک بازه زمانی لازم است`;
      for (const interval of day.intervals) {
        if (!validateTime(interval.opensAt) || !validateTime(interval.closesAt)) {
          return `${PERSIAN_DAYS[i]}: زمان وارد شده معتبر نیست (فرمت HH:mm)`;
        }
        if (interval.opensAt >= interval.closesAt) {
          return `${PERSIAN_DAYS[i]}: زمان شروع باید قبل از زمان پایان باشد`;
        }
      }
      for (let a = 0; a < day.intervals.length; a++) {
        for (let b = a + 1; b < day.intervals.length; b++) {
          if (intervalsOverlap(day.intervals[a], day.intervals[b])) {
            return `${PERSIAN_DAYS[i]}: بازه‌های زمانی نمی‌توانند هم‌پوشانی داشته باشند`;
          }
        }
      }
    }
  }
  return null;
}

interface WeeklyScheduleEditorProps {
  schedule: DaySchedule[];
  onChange: (schedule: DaySchedule[]) => void;
  errors?: string | null;
}

export function WeeklyScheduleEditor({ schedule, onChange, errors }: WeeklyScheduleEditorProps) {
  const updateDay = (dayIndex: number, updater: (day: DaySchedule) => DaySchedule) => {
    const next = [...schedule];
    next[dayIndex] = updater(next[dayIndex]);
    onChange(next);
  };

  const addInterval = (dayIndex: number) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      intervals: [...day.intervals, { opensAt: '16:00', closesAt: '20:00' }],
    }));
  };

  const removeInterval = (dayIndex: number, intervalIndex: number) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      intervals: day.intervals.filter((_, i) => i !== intervalIndex),
    }));
  };

  const updateInterval = (dayIndex: number, intervalIndex: number, field: 'opensAt' | 'closesAt', value: string) => {
    updateDay(dayIndex, (day) => ({
      ...day,
      intervals: day.intervals.map((interval, i) =>
        i === intervalIndex ? { ...interval, [field]: value } : interval
      ),
    }));
  };

  return (
    <div className="space-y-3">
      {schedule.map((day, dayIndex) => (
        <div key={dayIndex} className="rounded-lg border border-background-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <Label className="text-base font-bold min-w-[80px]">{PERSIAN_DAYS[dayIndex]}</Label>
            <select
              value={day.mode}
              onChange={(e) => {
                const mode = e.target.value as DayMode;
                updateDay(dayIndex, () => ({
                  mode,
                  intervals: mode === 'WORKING_HOURS' ? [{ opensAt: '08:00', closesAt: '22:00' }] : [],
                }));
              }}
              className="rounded-md border border-background-300 bg-background-50 p-2 text-sm"
            >
              <option value="CLOSED">{MODE_LABELS.CLOSED}</option>
              <option value="WORKING_HOURS">{MODE_LABELS.WORKING_HOURS}</option>
              <option value="TWENTY_FOUR_HOURS">{MODE_LABELS.TWENTY_FOUR_HOURS}</option>
            </select>
          </div>

          {day.mode === 'WORKING_HOURS' && (
            <div className="mt-3 space-y-2">
              {day.intervals.map((interval, intervalIndex) => (
                <div key={intervalIndex} className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-text-500" />
                  <Input
                    type="time"
                    value={interval.opensAt}
                    onChange={(e) => updateInterval(dayIndex, intervalIndex, 'opensAt', e.target.value)}
                    className="w-32"
                  />
                  <span className="text-text-500">→</span>
                  <Input
                    type="time"
                    value={interval.closesAt}
                    onChange={(e) => updateInterval(dayIndex, intervalIndex, 'closesAt', e.target.value)}
                    className="w-32"
                  />
                  {day.intervals.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeInterval(dayIndex, intervalIndex)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addInterval(dayIndex)}>
                <Plus className="ml-1 h-4 w-4" />
                افزودن بازه
              </Button>
            </div>
          )}
        </div>
      ))}
      {errors && <p className="text-sm text-red-600">{errors}</p>}
    </div>
  );
}
