import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Timora AI",
  description: "시간을 밝히는 AI, 캠퍼스를 효율적으로",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <header className="border-b border-white/10">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold brand">Timora AI</div>
              <div className="text-[12px] text-white/70 mt-0.5">시간을 밝히는 AI, 캠퍼스를 효율적으로</div>
            </div>
            <nav className="text-sm space-x-4">
              <a href="/" className="hover:underline">Home</a>
              <a href="/import" className="hover:underline">Import CSV</a>
              <a href="/scheduler" className="hover:underline">Scheduler</a>
              <a href="/dataset" className="hover:underline">Dataset</a>
              <a href="/developers" className="hover:underline">Developers</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
