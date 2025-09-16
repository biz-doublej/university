import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CampusOps AI",
  description: "실습실·강의실 자동배정 & 공실활용 플랫폼",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <div className="text-lg font-semibold">CampusOps AI</div>
            <nav className="text-sm space-x-4">
              <a href="/" className="hover:underline">Home</a>
              <a href="/import" className="hover:underline">Import CSV</a>
              <a href="/scheduler" className="hover:underline">Scheduler</a>
              <a href="/dataset" className="hover:underline">Dataset</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
