'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Check, X, Pause, Eye } from 'lucide-react';
import { toast } from 'sonner';

type Pharmacy = { id: string; name: string; license_number: string; status: string; created_at: string; city_name?: string; rejection_reason?: string | null };
const labels: Record<string, string> = { PENDING_APPROVAL: 'در انتظار بررسی', APPROVED: 'تأیید شده', REJECTED: 'رد شده', SUSPENDED: 'معلق' };
const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { PENDING_APPROVAL: 'secondary', APPROVED: 'default', REJECTED: 'destructive', SUSPENDED: 'outline' };

export default function AdminPharmaciesPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selected, setSelected] = useState<Pharmacy | null>(null);
  const [reason, setReason] = useState('');
  const [fetchLoading, setFetchLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    const res = await fetch('/api/admin/pharmacies', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPharmacies((await res.json()).pharmacies || []);
    setFetchLoading(false);
  };

  useEffect(() => { if (loading) return; if (!user) { router.push('/auth/login'); return; } if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) router.push('/patient/dashboard'); }, [user, loading, router]);
  useEffect(() => { if (token && user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role)) load(); }, [token, user]);

  const update = async (status: string) => {
    if (!selected || !token) return;
    if (status === 'REJECTED' && !reason.trim()) { toast.error('دلیل رد را وارد کنید'); return; }
    setActionLoading(true);
    const res = await fetch('/api/admin/pharmacies', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id: selected.id, status, rejectionReason: reason }) });
    setActionLoading(false);
    if (!res.ok) { toast.error('عملیات انجام نشد'); return; }
    toast.success('وضعیت داروخانه به‌روزرسانی شد'); setSelected(null); setReason(''); load();
  };

  if (loading || !user) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;
  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => router.push('/admin/dashboard')}><ArrowRight className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold text-text-900">مدیریت داروخانه‌ها</h1><p className="text-sm text-text-600">بررسی و مدیریت درخواست‌های ثبت‌نام</p></div></div><Card className="mt-8"><CardContent className="overflow-x-auto p-0"><table className="w-full text-right"><thead><tr className="border-b border-background-200 text-sm text-text-600"><th className="p-4">نام داروخانه</th><th className="p-4">شماره مجوز</th><th className="p-4">شهر</th><th className="p-4">وضعیت</th><th className="p-4">عملیات</th></tr></thead><tbody>{fetchLoading ? <tr><td colSpan={5} className="p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-primary-600" /></td></tr> : pharmacies.length === 0 ? <tr><td colSpan={5} className="p-10 text-center text-text-600">درخواستی ثبت نشده است.</td></tr> : pharmacies.map((pharmacy) => <tr key={pharmacy.id} className="border-b border-background-200 last:border-0"><td className="p-4 font-medium text-text-900">{pharmacy.name}</td><td className="p-4 text-text-700" dir="ltr">{pharmacy.license_number}</td><td className="p-4 text-text-700">{pharmacy.city_name || '—'}</td><td className="p-4"><Badge variant={variants[pharmacy.status] || 'outline'}>{labels[pharmacy.status] || pharmacy.status}</Badge></td><td className="p-4"><Button variant="ghost" size="sm" onClick={() => setSelected(pharmacy)}><Eye className="ml-1 h-4 w-4" />بررسی</Button></td></tr>)}</tbody></table></CardContent></Card>{selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}><Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}><CardContent className="space-y-5 p-6"><div><h2 className="text-xl font-bold text-text-900">{selected.name}</h2><p className="mt-1 text-sm text-text-600">جزئیات درخواست داروخانه</p></div><div className="grid gap-3 rounded-lg bg-background-100 p-4 text-sm"><p>شماره مجوز: <span dir="ltr">{selected.license_number}</span></p><p>وضعیت فعلی: {labels[selected.status]}</p><p>تاریخ درخواست: {new Date(selected.created_at).toLocaleDateString('fa-IR')}</p></div>{selected.status === 'PENDING_APPROVAL' && <><div className="space-y-2"><label className="text-sm font-medium">دلیل رد (در صورت رد درخواست)</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-24 w-full rounded-md border border-background-300 bg-background-50 p-3 text-sm outline-none focus:ring-2 focus:ring-primary-400" placeholder="دلیل رد درخواست را وارد کنید" /></div><div className="flex flex-wrap gap-2"><Button disabled={actionLoading} onClick={() => update('APPROVED')}><Check className="ml-1 h-4 w-4" />تأیید ثبت‌نام</Button><Button disabled={actionLoading} variant="destructive" onClick={() => update('REJECTED')}><X className="ml-1 h-4 w-4" />رد ثبت‌نام</Button><Button disabled={actionLoading} variant="outline" onClick={() => update('SUSPENDED')}><Pause className="ml-1 h-4 w-4" />تعلیق</Button></div></>}{selected.status === 'APPROVED' && <Button variant="outline" disabled={actionLoading} onClick={() => update('SUSPENDED')}><Pause className="ml-1 h-4 w-4" />تعلیق داروخانه</Button>}<Button variant="ghost" className="w-full" onClick={() => setSelected(null)}>بستن</Button></CardContent></Card></div>}</main>;
}
