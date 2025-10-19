"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  courseId: number | null;
  courseName?: string | null;
  token: string | null;
  onClose: () => void;
  onSubmitted?: (resp: any) => void;
};

const labels = [
  "매우 안좋음",
  "안좋음",
  "보통",
  "좋음",
  "매우 좋음",
];

export default function ReviewModal({ open, courseId, courseName, token, onClose, onSubmitted }: Props) {
  const [answers, setAnswers] = useState<number[]>([3, 3, 3, 3]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const setAnswer = (idx: number, val: number) => {
    const copy = [...answers];
    copy[idx] = val;
    setAnswers(copy);
  };

  const submit = async () => {
    if (!token) {
      setMsg("로그인이 필요합니다.");
      return;
    }
    if (!courseId) return;
    setLoading(true);
    setMsg(null);
    try {
      const avg = Math.round(answers.reduce((a, b) => a + b, 0) / answers.length);
      const payload = {
        course_id: courseId,
        rating_overall: avg,
        rating_difficulty: answers[1],
        rating_instructor: answers[2],
        answers,
        comment,
      };
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/v1/student/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.detail || j?.error || "submit_failed");
      setMsg("후기가 제출되었습니다.");
      onSubmitted?.(j);
      // close after short delay
      setTimeout(() => onClose(), 800);
    } catch (e: any) {
      setMsg(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="bg-white dark:bg-slate-900 text-black dark:text-white rounded-lg p-6 w-full max-w-2xl z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="font-semibold">{courseName ?? "후기 작성"}</div>
          <button onClick={onClose} className="text-sm text-slate-500">닫기</button>
        </div>
        <div className="space-y-3">
          {["총평", "난이도", "강의력", "추천의사"].map((q, i) => (
            <div key={i}>
              <div className="text-sm font-medium mb-1">{q}</div>
              <div className="flex gap-2">
                {labels.map((lab, idx) => (
                  <label key={idx} className="text-xs flex items-center gap-1">
                    <input type="radio" name={`q-${i}`} checked={answers[i] === idx + 1} onChange={() => setAnswer(i, idx + 1)} />
                    <span>{lab}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="text-sm font-medium mb-1">자세한 후기</div>
            <textarea className="w-full p-2 border rounded" rows={6} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>

          {msg && <div className="text-sm text-rose-500">{msg}</div>}

          <div className="flex justify-end gap-2">
            <button className="btn" onClick={onClose} disabled={loading}>취소</button>
            <button className="btn" onClick={submit} disabled={loading}>{loading ? '제출 중...' : '제출'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
