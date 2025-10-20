"use client";

import { useEffect, useMemo, useState } from "react";

type Course = {
  course_id: number;
  course_code?: string | null;
  course_name: string;
};

type Task = {
  id: string;
  courseId: number;
  title: string;
  dueDate?: string;
  weight?: string;
  status: "planned" | "published" | "graded";
};

type Props = {
  university: string;
};

const STORAGE_KEY = "professor-assessments";

export default function ProfessorAssessmentsClient({ university }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weight, setWeight] = useState("");
  const [status, setStatus] = useState<Task["status"]>("planned");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Task[];
        setTasks(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const res = await fetch("/api/faculty/courses");
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "강의 정보를 불러오지 못했습니다.");
        }
        const list = (data || []) as Array<Course & { enrollment_count: number }>;
        setCourses(list.map(({ course_id, course_code, course_name }) => ({ course_id, course_code, course_name })));
      } catch (err: any) {
        setError(err?.message || "강의 정보를 불러오지 못했습니다.");
      }
    };
    loadCourses();
  }, []);

  const courseMap = useMemo(() => {
    const map = new Map<number, Course>();
    for (const course of courses) map.set(course.course_id, course);
    return map;
  }, [courses]);

  const filteredTasks = useMemo(() => {
    if (selectedCourseId === "") return tasks;
    return tasks.filter((task) => task.courseId === selectedCourseId);
  }, [tasks, selectedCourseId]);

  const addTask = () => {
    setError(null);
    if (!selectedCourseId || !title.trim()) {
      setError("과목과 과제명을 입력해 주세요.");
      return;
    }
    const task: Task = {
      id: crypto.randomUUID(),
      courseId: Number(selectedCourseId),
      title: title.trim(),
      dueDate: dueDate || undefined,
      weight: weight || undefined,
      status,
    };
    setTasks((prev) => [task, ...prev]);
    setTitle("");
    setDueDate("");
    setWeight("");
  };

  const updateTaskStatus = (taskId: string, nextStatus: Task["status"]) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
  };

  const removeTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h1 className="text-3xl font-semibold text-white">{university} 평가 계획 보드</h1>
        <p className="mt-3 text-sm text-white/70">
          팀 프로젝트, 실험 보고, 중간·기말고사 등 평가 일정을 과목별로 정리하고 진행 상태를
          추적하세요. 저장된 정보는 브라우저에 안전하게 보관되며 언제든지 수정·삭제할 수
          있습니다.
        </p>
      </section>

      <section className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-lg backdrop-blur">
        <h2 className="text-xl font-semibold text-white">평가 항목 추가</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-sm font-medium text-white/70">
            강의 선택
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value ? Number(event.target.value) : "")}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            >
              <option value="">전체 과목</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {[course.course_code, course.course_name].filter(Boolean).join(" · ")}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium text-white/70">
            평가 항목
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 팀 프로젝트 최종 발표"
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-white/70">
            마감일
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-white/70">
            반영 비율 (선택)
            <input
              type="text"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="예: 20%"
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            />
          </label>
          <label className="text-sm font-medium text-white/70">
            상태
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Task["status"])}
              className="mt-2 w-full rounded-lg border border-white/20 bg-black/50 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            >
              <option value="planned">계획</option>
              <option value="published">공개</option>
              <option value="graded">채점</option>
            </select>
          </label>
          <div className="md:col-span-3">
            <button
              type="button"
              className="btn rounded-full px-5 py-2 text-sm"
              onClick={addTask}
            >
              평가 항목 추가
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg">
        <h2 className="text-xl font-semibold text-white">평가 일정표</h2>
        {filteredTasks.length === 0 ? (
          <div className="mt-3 text-sm text-white/60">등록된 평가 항목이 없습니다.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredTasks.map((task) => {
              const course = courseMap.get(task.courseId);
              return (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/80"
                >
                  <div>
                    <div className="font-semibold text-white">{task.title}</div>
                    <div className="text-xs text-white/50">
                      {course
                        ? [course.course_code, course.course_name].filter(Boolean).join(" · ")
                        : "과목 정보 없음"}
                    </div>
                    <div className="text-xs text-white/40">
                      {task.dueDate ? `마감일 ${task.dueDate}` : "마감일 미정"}
                      {task.weight ? ` · 반영 ${task.weight}` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={task.status}
                      onChange={(event) => updateTaskStatus(task.id, event.target.value as Task["status"])}
                      className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs text-white focus:border-indigo-400 focus:outline-none"
                    >
                      <option value="planned">계획</option>
                      <option value="published">공개</option>
                      <option value="graded">채점</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTask(task.id)}
                      className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
