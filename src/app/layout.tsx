import React from 'react';
import './globals.css';

export const metadata = {
  title: "EduCenter — Robototexnika va IT O'quv Markazi Boshqaruv Tizimi",
  description: "50-100 o'quvchiga mo'ljallangan zamonaviy ta'lim va geymifikatsiya platformasi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
