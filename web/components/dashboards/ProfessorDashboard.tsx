import React from "react";

type Props = { university: string };

export default function ProfessorDashboard({ university }: Props) {
  return (
    <div>
      <h1>{university} 교수 대시보드</h1>
      <section>
        <h2>수강신청 확인</h2>
        <p>강의별 수강신청 명단 확인</p>
      </section>
      <section>
        <h2>일정표 확인</h2>
        <p>교수용 시간표 미리보기</p>
      </section>
      <section>
        <h2>교과목 후기 확인</h2>
        <p>학생들이 남긴 수업 후기 확인</p>
      </section>
    </div>
  );
}
