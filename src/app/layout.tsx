import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Özgeçmiş Oluşturucu',
  description: 'Next.js + Supabase tabanlı CV oluşturma uygulaması',
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang='tr'>
      <body>{children}</body>
    </html>
  );
}
