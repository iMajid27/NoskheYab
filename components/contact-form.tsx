'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PersianDigitInput } from '@/components/persian-digit-input';
import { toEnglishDigits } from '@/lib/persian-utils';
import { toast } from 'sonner';

export function ContactForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: toEnglishDigits(phone), message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'ارسال پیام انجام نشد');
      setName(''); setPhone(''); setMessage('');
      toast.success('پیام شما با موفقیت ارسال شد');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ارسال پیام انجام نشد');
    } finally {
      setSending(false);
    }
  };

  return <form onSubmit={submit} className="mt-8 space-y-4 border-t border-background-200 pt-8">
    <h2 className="text-xl font-bold text-text-900">ارسال پیام</h2>
    <div className="space-y-2"><Label htmlFor="contact-name">نام</Label><Input id="contact-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required /></div>
    <div className="space-y-2"><Label htmlFor="contact-phone">شماره موبایل</Label><PersianDigitInput id="contact-phone" value={phone} onValueChange={setPhone} maxLength={11} required /></div>
    <div className="space-y-2"><Label htmlFor="contact-message">پیام</Label><Textarea id="contact-message" value={message} onChange={(e) => setMessage(e.target.value)} minLength={5} maxLength={2000} required /></div>
    <Button type="submit" disabled={sending}>{sending ? 'در حال ارسال...' : 'ارسال پیام'}</Button>
  </form>;
}
