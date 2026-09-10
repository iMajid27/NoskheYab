'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Building2, FileText, Clock, Settings } from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0 });
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) router.push('/patient/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!token || !user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return;
    fetch('/api/admin/pharmacies', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setStats(data.stats); })
      .finally(() => setFetchLoading(false));
  }, [token, user]);

  if (loading || !user) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;

  const cards = [
    { label: 'کل درخواست‌ها', value: stats.total, icon: FileText, color: 'bg-secondary-100 text-secondary-700' },
    { label: 'داروخانه‌های فعال', value: stats.approved, icon: Building2, color: 'bg-primary-100 text-primary-700' },
    { label: 'ثبت‌نام‌های در انتظار', value: stats.pending, icon: Clock, color: 'bg-accent-100 text-accent-700' },
  ];

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-text-900">پنل مدیریت</h1><p className="mt-1 text-sm text-text-600">مدیریت داروخانه‌ها و محتوای سایت</p></div><Button variant="ghost" onClick={() => { logout(); router.push('/'); }}><LogOut className="ml-2 h-4 w-4" />خروج</Button></div><div className="mt-8 grid gap-4 sm:grid-cols-3">{fetchLoading ? Array.from({ length: 3 }).map((_, i) => <Card key={i}><CardContent className="h-32 animate-pulse bg-background-100" /></Card>) : cards.map((card) => <Card key={card.label}><CardContent className="flex items-center gap-4 p-6"><div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}><card.icon className="h-6 w-6" /></div><div><p className="text-2xl font-bold text-text-900">{card.value}</p><p className="text-sm text-text-600">{card.label}</p></div></CardContent></Card>)}</div><div className="mt-8 grid gap-4 sm:grid-cols-2"><Link href="/admin/pharmacies"><Card className="cursor-pointer transition-all hover:border-primary-300 hover:shadow-md"><CardContent className="flex items-center gap-4 p-6"><Building2 className="h-8 w-8 text-primary-600" /><div><p className="font-bold text-text-900">مدیریت داروخانه‌ها</p><p className="text-sm text-text-600">بررسی و تأیید درخواست‌های ثبت‌نام</p></div></CardContent></Card></Link><Link href="/admin/content"><Card className="cursor-pointer transition-all hover:border-primary-300 hover:shadow-md"><CardContent className="flex items-center gap-4 p-6"><Settings className="h-8 w-8 text-primary-600" /><div><p className="font-bold text-text-900">مدیریت محتوا</p><p className="text-sm text-text-600">ویرایش درباره ما و تماس با ما</p></div></CardContent></Card></Link></div></main>;
}
