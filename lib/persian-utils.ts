const PERSIAN_TO_ENGLISH: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const ENGLISH_TO_PERSIAN: Record<string, string> = {
  '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
  '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹',
};

export function toEnglishDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (ch) => PERSIAN_TO_ENGLISH[ch] ?? ch);
}

export function toPersianDigits(input: string): string {
  return input.replace(/[0-9]/g, (ch) => ENGLISH_TO_PERSIAN[ch] ?? ch);
}

export function normalizePersianDigits(input: string): string {
  return toEnglishDigits(input);
}

export function normalizePhone(input: string): string {
  return toEnglishDigits(input).replace(/[\s\-()]/g, '');
}

export function isValidPostalCode(input: string): boolean {
  const normalized = toEnglishDigits(input).replace(/[\s-]/g, '');
  return /^\d{10}$/.test(normalized);
}

export function normalizePostalCode(input: string): string {
  return toEnglishDigits(input).replace(/[\s-]/g, '');
}
