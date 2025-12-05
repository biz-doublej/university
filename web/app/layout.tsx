import "./globals.css";
import type { Metadata } from "next";
import { AuthNav } from "../components/auth-nav";
import { I18nProvider } from "../components/i18n";
import { SiteFooter } from "../components/site-footer";
import { BrandTagline } from "../components/brand";

export const metadata: Metadata = {
  title: "Timora AI",
  description: "시간을 밝히는 AI, 캠퍼스를 효율적으로",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <I18nProvider>
          <header className="border-b border-white/10">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-lg font-semibold brand">Timora AI</div>
                <BrandTagline />
              </div>
              <AuthNav />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
