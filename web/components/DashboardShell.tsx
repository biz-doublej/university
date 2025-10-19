import React, { PropsWithChildren } from "react";

export default function DashboardShell({ children }: PropsWithChildren) {
  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 20 }}>
      <nav style={{ marginBottom: 12 }}>
        <a href="/dashboard/student" style={{ marginRight: 8 }}>학생</a>
        <a href="/dashboard/professor" style={{ marginRight: 8 }}>교수</a>
        <a href="/dashboard/admin" style={{ marginRight: 8 }}>관리자</a>
        <a href="/dashboard/developer" style={{ marginRight: 8 }}>개발자</a>
      </nav>
      <main>{children}</main>
    </div>
  );
}
