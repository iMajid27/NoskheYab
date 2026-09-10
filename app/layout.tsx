import './globals.css';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth-context';
import { Navbar } from '@/components/navbar';
import { Toaster } from '@/components/ui/sonner';

const iranYekan = localFont({
  src: [
    {
      path: '../public/fonts/Yekan.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/BYekan+_Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-iranyekan',
});

export const metadata: Metadata = {
  title: 'نسخه یاب | سیستم مسیریابی نسخه‌های دارویی',
  description: 'سریع‌ترین راه تأمین نسخه دارویی شما',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${iranYekan.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            <Navbar />
            {children}
          </AuthProvider>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
