import Link from "next/link";
import { Health } from "../components/health";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="card">
        <h1 className="text-xl font-semibold">대시보드 (MVP)</h1>
        <p className="text-sm text-white/70 mt-2">
          백엔드 연동 확인, CSV 업로드, 간단한 상태를 확인할 수 있습니다.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-3">
          <div className="font-medium">헬스체크</div>
          <Health />
        </div>

        <div className="card space-y-3">
          <div className="font-medium">데이터 가져오기</div>
          <p className="text-sm text-white/70">과목 섹션 CSV를 업로드하여 유효성 검사를 수행합니다.</p>
          <Link className="btn w-fit" href="/import">CSV 업로드 페이지로 이동</Link>
        </div>
      </div>
    </div>
  );
}

