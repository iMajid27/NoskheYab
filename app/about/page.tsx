import { queryOne } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const data = await queryOne<{ title: string; body: string }>(
    `SELECT title, body FROM site_content WHERE page_key = 'about'`
  );
  return <main className="mx-auto max-w-3xl px-4 py-16"><div className="rounded-2xl border border-background-200 bg-background-100 p-8 shadow-sm"><h1 className="text-3xl font-bold text-text-900">{data?.title || 'درباره نسخه یاب'}</h1><div className="mt-6 whitespace-pre-line text-lg leading-loose text-text-700">{data?.body || 'اطلاعات این صفحه به‌زودی منتشر می‌شود.'}</div></div></main>;
}
