import './globals.css';
import React from 'react';
import { Inter } from 'next/font/google';
import LayoutWrapper from '@/components/LayoutWrapper';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthProvider } from '@/components/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ApeAI — Automated Product Engineering AI',
  description: 'AI-assisted feedback clustering, multi-stage document drafting, and human-approved ticket publishing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className={`bg-slate-50 dark:bg-black text-slate-900 dark:text-zinc-100 antialiased transition-colors duration-300 ${inter.className}`}>
        <AuthProvider>
          <LayoutWrapper>
            <ToastProvider>
              {children}
            </ToastProvider>
          </LayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
