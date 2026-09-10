'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits } from '@/lib/persian-utils';

type Content = { id: string; page_key: string; title: string; body: string; updated_at: string };
type Setting = { key: string; value: string };
type Message = { id: string; name: string; phone: string; message: string; status: string; created_at: string };

const settingLabels: Record<string, string> = {
  contact_phone: 'تلفن', contact_mobile: 'موبایل', contact_address: 'آدرس', contact_email: 'ایمیل', contact_working_hours: 'ساعات کاری',
};

export default function AdminContentPage() {
  const router = useRouter();
  const { user, token, loading } = useAuth();
  const [items, setItems] = useState<Content[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (!['SUPER_ADMIN', 'ADMIN'].includes(user.role)) router.push('/patient/dashboard');
  }, [user, loading, router]);

  useEffect(() => {
    if (!token || !user || !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return;
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/admin/content', { headers }).then((response) => response.json()),
      fetch('/api/admin/contact', { headers }).then((response) => response.json()),
    ]).then(([contentData, contactData]) => {
      setItems(contentData.content || []);
      setSettings(contactData.settings || []);
      setMessages(contactData.messages || []);
    }).finally(() => setBusy(false));
  }, [token, user]);

  const saveContent = async (item: Content) => {
    if (!token) return;
    setSaving(item.page_key);
    const response = await fetch('/api/admin/content', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ pageKey: item.page_key, title: item.title, body: item.body }) });
    setSaving(null);
    if (response.ok) toast.success('محتوا ذخیره شد'); else toast.error('ذخیره محتوا انجام نشد');
  };

  const saveSetting = async (setting: Setting) => {
    if (!token) return;
    setSaving(setting.key);
    const response = await fetch('/api/admin/contact', { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(setting) });
    setSaving(null);
    if (response.ok) toast.success('اطلاعات تماس ذخیره شد'); else toast.error('ذخیره انجام نشد');
  };

  if (loading || !user) return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>;
  return <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
    <div className="flex items-center gap-3"><Button variant="ghost" size="icon" onClick={() => router.push('/admin/dashboard')}><ArrowRight className="h-5 w-5" /></Button><div><h1 className="text-2xl font-bold text-text-900">مدیریت محتوا و تماس‌ها</h1><p className="text-sm text-text-600">ویرایش محتوای سایت، اطلاعات تماس و مشاهده پیام‌ها</p></div></div>
    {busy ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary-600" /></div> : <div className="mt-8 space-y-6">
      {items.map((item) => <Card key={item.page_key}><CardContent className="space-y-4 p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-bold text-text-900">{item.page_key === 'about' ? 'درباره ما' : 'تماس با ما'}</h2><Button size="sm" disabled={saving === item.page_key} onClick={() => saveContent(item)}>{saving === item.page_key ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="ml-1 h-4 w-4" />ذخیره</>}</Button></div><Input value={item.title} onChange={(e) => setItems((all) => all.map((x) => x.page_key === item.page_key ? { ...x, title: e.target.value } : x))} placeholder="عنوان صفحه" /><textarea value={item.body} onChange={(e) => setItems((all) => all.map((x) => x.page_key === item.page_key ? { ...x, body: e.target.value } : x))} className="min-h-48 w-full rounded-md border border-background-300 bg-background-50 p-3 leading-8 text-text-900 outline-none focus:ring-2 focus:ring-primary-400" placeholder="متن صفحه" /></CardContent></Card>)}
      <Card><CardContent className="space-y-4 p-6"><h2 className="text-lg font-bold">اطلاعات تماس</h2>{settings.map((setting) => <div key={setting.key} className="flex items-center gap-3"><Input value={setting.value} onChange={(e) => setSettings((all) => all.map((x) => x.key === setting.key ? { ...x, value: e.target.value } : x))} placeholder={settingLabels[setting.key]} /><Button size="sm" disabled={saving === setting.key} onClick={() => saveSetting(setting)}>{saving === setting.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}</Button></div>)}</CardContent></Card>
      <Card><CardContent className="space-y-4 p-6"><h2 className="text-lg font-bold">پیام‌های تماس ({messages.length})</h2>{messages.length === 0 ? <p className="text-text-600">پیامی ثبت نشده است.</p> : messages.map((message) => <div key={message.id} className="rounded-lg border border-background-200 p-4"><div className="flex flex-wrap justify-between gap-2 font-medium"><span>{message.name}</span><span dir="ltr">{toPersianDigits(message.phone)}</span></div><p className="mt-2 whitespace-pre-line text-text-700">{message.message}</p><p className="mt-2 text-xs text-text-500">{new Date(message.created_at).toLocaleString('fa-IR')}</p></div>)}</CardContent></Card>
    </div>}
  </main>;
}
