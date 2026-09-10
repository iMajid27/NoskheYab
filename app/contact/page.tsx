import { query, queryOne } from '@/lib/db';
import { toPersianDigits } from '@/lib/persian-utils';
import { ContactForm } from '@/components/contact-form';

export const dynamic = 'force-dynamic';

type Setting = { key: string; value: string };

export default async function ContactPage() {
  const [content, settings] = await Promise.all([
    queryOne<{ title: string; body: string }>(`SELECT title, body FROM site_content WHERE page_key = 'contact'`),
    query<Setting>(`SELECT key, value FROM site_settings WHERE key LIKE 'contact_%'`),
  ]);
  const values = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return <main className="mx-auto max-w-3xl px-4 py-16"><div className="rounded-2xl border border-background-200 bg-background-100 p-8 shadow-sm">
    <h1 className="text-3xl font-bold text-text-900">{content?.title || 'تماس با نسخه یاب'}</h1>
    <div className="mt-6 whitespace-pre-line text-lg leading-loose text-text-700">{content?.body || ''}</div>
    <div className="mt-6 space-y-3 rounded-xl bg-background-50 p-5 text-text-700">
      <p>تلفن: <span dir="ltr">{toPersianDigits(values.contact_phone || '')}</span></p>
      <p>موبایل: <span dir="ltr">{toPersianDigits(values.contact_mobile || '')}</span></p>
      <p>ایمیل: <span dir="ltr">{values.contact_email || ''}</span></p>
      <p>آدرس: {values.contact_address || ''}</p>
      <p>ساعات کاری: {values.contact_working_hours || ''}</p>
    </div>
    <ContactForm />
  </div></main>;
}
