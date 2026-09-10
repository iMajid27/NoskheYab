'use client';

import { useLayoutEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { toEnglishDigits, toPersianDigits } from '@/lib/persian-utils';

interface PersianDigitInputProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onValueChange: (englishValue: string) => void;
}

export function PersianDigitInput({ value, onValueChange, ...props }: PersianDigitInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);

  useLayoutEffect(() => {
    if (!inputRef.current || !selectionRef.current) return;
    inputRef.current.setSelectionRange(selectionRef.current.start, selectionRef.current.end);
    selectionRef.current = null;
  }, [value]);

  return (
    <Input
      {...props}
      ref={inputRef}
      value={toPersianDigits(value)}
      onChange={(event) => {
        selectionRef.current = {
          start: event.target.selectionStart ?? event.target.value.length,
          end: event.target.selectionEnd ?? event.target.value.length,
        };
        onValueChange(toEnglishDigits(event.target.value));
      }}
      dir="ltr"
      inputMode="numeric"
    />
  );
}
