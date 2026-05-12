import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'LeadGen — Free B2B Lead Generation' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="hidden w-56 flex-shrink-0 bg-slate-900 px-4 py-6 md:flex md:flex-col">
            <Link href="/" className="mb-8 flex items-center gap-2 text-white">
              <span className="text-xl">⚡</span>
              <span className="font-bold tracking-tight">LeadGen</span>
            </Link>
            <nav className="flex flex-col gap-1 text-sm">
              <Link href="/" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                New Search
              </Link>
              <Link href="/searches" className="rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white">
                All Searches
              </Link>
            </nav>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
