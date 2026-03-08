import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Resume Builder',
  description: 'Next.js + Supabase tabanli CV olusturma uygulamasi',
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
