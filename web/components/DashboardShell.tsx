"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { PropsWithChildren } from "react";

const NAV_ITEMS = [
  { href: "/dashboard/student", label: "학생" },
  { href: "/dashboard/professor", label: "교수" },
  { href: "/dashboard/admin", label: "관리자" },
  { href: "/dashboard/developer", label: "개발자" },
];

export default function DashboardShell({ children }: PropsWithChildren) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <nav className="mb-6 flex flex-wrap gap-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`btn rounded-full px-5 py-2 text-sm ${
                active ? "ring-2 ring-white/70" : "opacity-80 hover:opacity-100"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <main>{children}</main>
    </div>
  );
}
