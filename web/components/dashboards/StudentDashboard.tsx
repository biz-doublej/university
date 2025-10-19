import React from "react";

type Props = { university: string };

export default function StudentDashboard({ university }: Props) {
  return (
    <div>
      <h1>{university} 학생 대시보드</h1>
      <section>
        <h2>수강신청</h2>
        <p>수강신청 목록을 보고 신청/취소를 할 수 있습니다. (샘플)</p>
      </section>
      <section>
        <h2>일정표 확인</h2>
        <p>개인 시간표 미리보기</p>
      </section>
      <section>
        <h2>수업 후기 남기기</h2>
        <p>수강한 과목에 대한 간단한 후기 작성</p>
      </section>
    </div>
  );
}
