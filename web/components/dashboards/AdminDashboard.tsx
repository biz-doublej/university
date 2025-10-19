import React from "react";

type Props = { university: string };

export default function AdminDashboard({ university }: Props) {
  return (
    <div>
      <h1>{university} 관리자 대시보드</h1>
      <section>
        <h2>수강신청 관리</h2>
        <p>개설/수강 데이터 관리, 시간표 배정(AI), 학생/교수 관리 등</p>
      </section>
      <section>
        <h2>시스템 설정</h2>
        <p>관리자 전용 설정 영역 (개발자 허가 필요)</p>
      </section>
    </div>
  );
}
