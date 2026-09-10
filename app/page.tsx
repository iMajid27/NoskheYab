import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Pill, Clock, MapPin, ShieldCheck, FileSearch } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-[calc(100vh-4rem)]">
      <section className="relative overflow-hidden">
        <div className="mesh-gradient absolute inset-0" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="flex items-center gap-2 rounded-full border border-primary-300/40 bg-primary-50/60 px-4 py-1.5 text-sm text-primary-700 backdrop-blur-sm animate-fade-in">
            <ShieldCheck className="h-4 w-4" />
            <span>سیستم مسیریابی هوشمند نسخه‌های دارویی</span>
          </div>

          <h1 className="mt-8 max-w-3xl text-center text-4xl font-bold leading-tight text-text-900 sm:text-5xl lg:text-6xl animate-fade-in">
            سریع‌ترین راه{' '}
            <span className="text-gradient">تأمین نسخه</span>
          </h1>

          <p className="mt-6 max-w-2xl text-center text-lg text-text-700 sm:text-xl animate-fade-in">
            نسخه خود را ثبت کنید، داروخانه‌های منطقه شما پیشنهاد قیمت بدهند، و
            در کمترین زمان داروی خود را دریافت کنید.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row animate-fade-in">
            <Link href="/auth/login">
              <Button size="lg" className="w-full sm:w-auto text-base">ثبت نسخه</Button>
            </Link>
            <Link href="/pharmacy/register">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                ثبت‌نام داروخانه
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl border border-background-200 bg-background-100 p-6 transition-all hover:border-primary-300 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
              <MapPin className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-text-900">مسیریابی جغرافیایی</h3>
            <p className="mt-2 text-sm text-text-600 leading-relaxed">
              نسخه شما فقط به داروخانه‌های تأییدشده در شهر شما ارسال می‌شود.
            </p>
          </div>

          <div className="rounded-xl border border-background-200 bg-background-100 p-6 transition-all hover:border-primary-300 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent-100 text-accent-700">
              <Clock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-text-900">پاسخگویی سریع</h3>
            <p className="mt-2 text-sm text-text-600 leading-relaxed">
              داروخانه‌ها به‌سرعت پیشنهاد قیمت می‌دهند و شما بهترین را انتخاب می‌کنید.
            </p>
          </div>

          <div className="rounded-xl border border-background-200 bg-background-100 p-6 transition-all hover:border-primary-300 hover:shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary-100 text-secondary-700">
              <FileSearch className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-text-900">تأمین آبشاری</h3>
            <p className="mt-2 text-sm text-text-600 leading-relaxed">
              اگر دارویی موجود نبود، به‌صورت خودکار برای داروخانه‌های دیگر ارسال می‌شود.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
