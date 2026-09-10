'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PersianDigitInput } from '@/components/persian-digit-input';
import { toEnglishDigits, toPersianDigits } from '@/lib/persian-utils';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    const destination = ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
      ? '/admin/dashboard'
      : ['PHARMACY_ADMIN', 'PHARMACY_USER'].includes(user.role)
        ? '/pharmacy/dashboard'
        : '/patient/dashboard';
    router.push(destination);
  }, [user, router]);

  useEffect(() => {
    if (step === 'otp' && otpRef.current) otpRef.current.focus();
  }, [step]);

  const handleSendOtp = async () => {
    if (!/^09\d{9}$/.test(toEnglishDigits(phone))) {
      toast.error('شماره موبایل معتبر وارد کنید');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: toEnglishDigits(phone) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارسال کد');
      setStep('otp');
      toast.success('کد تأیید ارسال شد. کد در محیط توسعه در گزارش سرور نمایش داده می‌شود.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در ارسال کد');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (toEnglishDigits(otp).length !== 5) { toast.error('کد ۵ رقمی را وارد کنید'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: toEnglishDigits(phone), otp: toEnglishDigits(otp) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'کد نامعتبر است');
      login(data.token, data.user);
      toast.success('ورود موفقیت‌آمیز بود');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'کد نامعتبر است');
    } finally { setLoading(false); }
  };

  return (
    <div className="mesh-gradient flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md border-background-200/60 bg-background-50/90 backdrop-blur-md shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-primary-50"><Phone className="h-7 w-7" /></div>
          <CardTitle className="text-2xl font-bold text-background-900">{step === 'phone' ? 'ورود به حساب' : 'تأیید کد'}</CardTitle>
          <CardDescription className="text-background-600">{step === 'phone' ? 'شماره موبایل خود را وارد کنید' : `کد ۵ رقمی ارسال شده به ${toPersianDigits(phone)} را وارد کنید`}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'phone' ? <div className="space-y-2"><Label htmlFor="phone" className="text-background-700">شماره موبایل</Label><PersianDigitInput id="phone" placeholder="۰۹۱۲۳۴۵۶۷۸۹" value={phone} onValueChange={setPhone} onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()} className="text-center text-lg tracking-wider" maxLength={11} /></div> : <div className="flex flex-col items-center gap-2"><Label className="text-background-700">کد تأیید</Label><InputOTP maxLength={5} value={toPersianDigits(otp)} onChange={(value) => setOtp(toEnglishDigits(value))}><InputOTPGroup dir="ltr"><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /><InputOTPSlot index={4} /></InputOTPGroup></InputOTP></div>}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          {step === 'phone' ? <Button onClick={handleSendOtp} disabled={loading} className="w-full" size="lg">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ارسال کد تأیید'}</Button> : <><Button onClick={handleVerifyOtp} disabled={loading} className="w-full" size="lg">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأیید و ورود'}</Button><Button variant="ghost" onClick={() => { setStep('phone'); setOtp(''); }} className="w-full"><ArrowLeft className="ml-2 h-4 w-4" />تغییر شماره</Button></>}
        </CardFooter>
      </Card>
    </div>
  );
}
