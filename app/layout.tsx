import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastContext';

export const metadata: Metadata = {
  title: 'Student Tracker | Recruitment & Evaluation Dashboard',
  description: 'Local-only student recruitment and tracking dashboard with SQLite persistence',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-800">
        <ToastProvider>
          <div className="flex min-h-screen bg-slate-50">
            <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
