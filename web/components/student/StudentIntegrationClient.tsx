"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type CurriculumEntry = {
  id: number;
  department: string;
  active_until: string | null;
  active: boolean;
  created_at: string;
  data_summary: Record<string, number>;
};

type Props = {
  university: string;
};

const CURRICULUM_SAMPLE = JSON.stringify(
  {
    semester: "2025-1학기",
    department: "컴퓨터공학",
    courses: [
      {
        code: "CS301",
        name: "AI 시스템 설계",
        instructor: "김수환",
        cohort: "3학년",
        expected_enrollment: 80,
      },
      {
        code: "CS402",
        name: "데이터센터 실습",
        instructor: "이은영",
        cohort: "4학년",
        expected_enrollment: 30,
      },
    ],
    rooms: [
      { name: "공학관 101호", building: "공학관", capacity: 45 },
      { name: "공학관 실습실", building: "공학관", capacity: 28, type: "lab" },
    ],
  },
  null,
  2,
);

function formatDeadline(iso?: string | null) {
  if (!iso) return "미정";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "미정";
  return date.toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
}

export default function StudentIntegrationClient({ university }: Props) {
  const [entries, setEntries] = useState<CurriculumEntry[]>([]);
  const [payload, setPayload] = useState<string>(CURRICULUM_SAMPLE);
  const [department, setDepartment] = useState<string>("컴퓨터공학");
  const [activeUntil, setActiveUntil] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [activateNow, setActivateNow] = useState<boolean>(true);

  const loadEntries = async () => {
    try {
      const res = await fetch("/api/tenant-admin/curriculum");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "통합 편성 데이터를 불러오지 못했습니다.");
      }
      setEntries(data || []);
    } catch (err: any) {
      setMessage(err?.message || "통합 편성 상태를 확인할 수 없습니다.");
    }
  };

  useEffect(() => {
    void loadEntries();
  }, []);

  const submitIntegration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const parsed = payload ? JSON.parse(payload) : {};
      const res = await fetch("/api/tenant-admin/curriculum", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department: department.trim() || "전체",
          data: parsed,
          active_until: activeUntil ? new Date(activeUntil).toISOString() : null,
          activate: activateNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "편성 업로드에 실패했습니다.");
      }
      setMessage(`저장 완료 · ${data.department} (${activateNow ? "활성화" : "임시 저장"})`);
      await loadEntries();
    } catch (err: any) {
      setMessage(err?.message || "편성 업로드 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.active) ?? entries[0],
    [entries],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">{university} 수강/편성 통합</h1>
            <p className="mt-2 text-sm text-white/70">
              학과별 수강 신청 데이터를 업로드하고, AI가 강의실·시간표를 자동으로 배정할 수 있도록
              기간을 설정하세요. 활성화된 학과는 교수와 학생 포털에서 자동으로 반영됩니다.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-black/40 px-5 py-3 text-center text-sm text-white/80">
            <div className="text-sm font-semibold text-white">수강 신청 사이트 + 강의실 자동 배정 + 모든 학과 제공</div>
            <div className="text-xs uppercase tracking-[0.3em] text-white/60">통합</div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">학과별 데이터 업로드</h2>
            <p className="mt-1 text-sm text-white/60">
              JSON 형태로 학과, 강의, 강의실 정보를 넣으면 시스템이 적절한 학과/학년별 배정 시나리오를
              생성합니다.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <input
              id="activateNow"
              type="checkbox"
              checked={activateNow}
              onChange={(event) => setActivateNow(event.target.checked)}
              className="h-4 w-4 rounded border-white/40 bg-black/50 text-blue-400 focus:ring-blue-300"
            />
            <label htmlFor="activateNow">즉시 활성화</label>
          </div>
        </div>
        <form onSubmit={submitIntegration} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-white/80">학과 (또는 캠퍼스 그룹)</label>
              <input
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="예: 컴퓨터공학과"
              />
              <label className="block text-sm font-medium text-white/80">활성화 종료 시점</label>
              <input
                type="datetime-local"
                value={activeUntil}
                onChange={(event) => setActiveUntil(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              />
              <p className="text-xs text-white/50">
                활성화된 데이터는 설정한 종료 시점 이후 자동으로 마감됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/80">학과 통합 JSON</label>
              <textarea
                className="h-full w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-400 focus:outline-none"
                value={payload}
                onChange={(event) => setPayload(event.target.value)}
              />
              <p className="text-xs text-white/50">courses, rooms 필드를 포함한 JSON을 넣어 주세요.</p>
            </div>
          </div>
          <button className="btn w-full px-6 py-3" type="submit" disabled={saving}>
            {saving ? "저장 중..." : "데이터 저장 및 활성화"}
          </button>
          {message && <div className="text-sm text-white/70">{message}</div>}
        </form>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">활성화 내역</h2>
            <p className="text-sm text-white/60">
              해당 학과 데이터를 기준으로 언제까지 수강 신청과 AI 배정이 열려있었는지 확인합니다.
            </p>
          </div>
        </div>
        {entries.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/30 px-4 py-6 text-sm text-white/60">
            아직 업로드된 학과 데이터가 없습니다. 데이터를 저장하면 활성화 목록에 추가됩니다.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/80"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-semibold text-white">{entry.department}</div>
                    <div className="text-xs text-white/50">ID {entry.id}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entry.active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/60"
                    }`}
                  >
                    {entry.active ? "활성화 중" : "비활성"}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/60">
                  <div>종료: {formatDeadline(entry.active_until)}</div>
                  <div>업로드: {formatDeadline(entry.created_at)}</div>
                </div>
                {Object.keys(entry.data_summary || {}).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                    {Object.entries(entry.data_summary).map(([name, count]) => (
                      <span key={name} className="rounded-full bg-white/10 px-2 py-1">
                        {name} {count}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {activeEntry && (
          <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-100">
            현재 활성 학과 <span className="font-semibold">{activeEntry.department}</span>은
            {activeEntry.active_until ? ` ${formatDeadline(activeEntry.active_until)}까지` : " 예정 없이"} 운영됩니다.
          </div>
        )}
      </section>
    </div>
  );
}
