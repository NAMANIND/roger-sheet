import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { PRODUCT_DESCRIPTION, PRODUCT_NAME } from '@/lib/brand';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — Job Queue`,
  description: PRODUCT_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className={`${inter.className} h-full antialiased`}>{children}</body>
    </html>
  );
}
