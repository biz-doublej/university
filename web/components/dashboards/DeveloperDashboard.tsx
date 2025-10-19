import React from "react";

type Props = { university: string; schoolCode?: string | null };

export default function DeveloperDashboard({ university, schoolCode }: Props) {
  return (
    <div>
      <h1>개발자 대시보드</h1>
      <p>모든 학교 접근 · 빅데이터 시각화 · 관리자 권한 부여</p>

      <section>
        <h2>학교 접속</h2>
        <form method="get" action="/dashboard/developer">
          <input name="school" placeholder="학교 코드 입력" defaultValue={schoolCode || ""} />
          <button style={{ marginLeft: 8 }}>접속</button>
        </form>
      </section>

      <section>
        <h2>현재 선택 학교</h2>
        <p>{university}</p>
      </section>
    </div>
  );
}
