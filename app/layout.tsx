import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: "Roger Sheet - Queue Management",
  description: "BullMQ-inspired queue system using Google Sheets + Apps Script",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans antialiased">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <nav className="flex items-center justify-between">
              <div className="flex items-center gap-12">
                <Link href="/" className="text-xl font-medium text-gray-900">
                  Roger Sheet
                </Link>
                <div className="flex gap-8">
                  <Link 
                    href="/" 
                    className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link 
                    href="/jobs" 
                    className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Jobs
                  </Link>
                  <Link 
                    href="/cron" 
                    className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Scheduled
                  </Link>
                  <Link 
                    href="/queues" 
                    className="text-sm font-normal text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Queues
                  </Link>
                </div>
              </div>
              <Link href="/jobs/new">
                <button className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm">
                  Create Job
                </button>
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
