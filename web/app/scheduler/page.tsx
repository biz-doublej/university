"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { useI18n } from "../../components/i18n";

type SolverStatus = { greedy: boolean; pulp: boolean; ortools: boolean };
type OptimizeResp = { job_id: string; status: string; solver?: string };
type OptimizeStatus = { job_id: string; status: string; score?: number; explain?: string };

export default function SchedulerPage() {
  const { t } = useI18n();
  const [status, setStatus] = useState<SolverStatus>({ greedy: true, pulp: false, ortools: false });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [week, setWeek] = useState<string>("2025-09");
  const [solver, setSolver] = useState<string>("greedy");
  const [slotGroup, setSlotGroup] = useState<number>(1);
  const [forbid, setForbid] = useState<boolean>(true);
  const [job, setJob] = useState<OptimizeStatus | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/v1/scheduler/status")
      .then((r) => r.json())
      .then((j: SolverStatus) => setStatus(j))
      .catch(() => {});
  }, []);

  const runImport = async () => {
    setMsg("");
    setLoading(true);
    try {
      const r = await apiFetch("/v1/import/dataset", { method: "POST" });
      const j = await r.json();
      if (!r.ok || j.imported === false) throw new Error(j.reason || `HTTP ${r.status}`);
      setMsg(`Imported ${j.file} rooms:${j.created?.rooms} courses:${j.created?.courses}`);
    } catch (e: any) {
      setMsg(`Import failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const seedTimeslots = async () => {
    setMsg("");
    const r = await apiFetch("/v1/dev/seed_minimum", { method: "POST" });
    const j = await r.json();
    setMsg(`Seeded: rooms ${j.created?.rooms ?? 0}, timeslots ${j.created?.timeslots ?? 0}`);
  };

  const runOptimize = async () => {
    setLoading(true);
    setJob(null);
    setAssignments([]);
    try {
      const body = { policy_version: 1, week, solver, slot_group: slotGroup, forbid_checks: forbid };
      const r = await apiFetch("/v1/optimize", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j: OptimizeResp = await r.json();
      if (!r.ok) throw new Error(j as any);
      // Poll
      const poll = async () => {
        const rs = await apiFetch(`/v1/optimize/${j.job_id}`);
        const s: OptimizeStatus = await rs.json();
        setJob(s);
        if (s.status === "completed" || s.status === "failed") {
          if (s.status === "completed") {
            const tt = await apiFetch(`/v1/timetable/rooms?week=${encodeURIComponent(week)}`);
            const list = await tt.json();
            setAssignments(list);
          }
        } else {
          setTimeout(poll, 800);
        }
      };
      poll();
    } catch (e: any) {
      setMsg(`Optimize failed: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("scheduler.title")}</h1>
      <div className="card space-y-3">
        <div className="text-sm text-white/80">{t("scheduler.desc")}</div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={runImport} disabled={loading}>{t("scheduler.importBtn")}</button>
          <button className="btn" onClick={seedTimeslots}>{t("scheduler.seedBtn")}</button>
        </div>
        {!!msg && <div className="text-white/70">{msg}</div>}
      </div>

      <div className="card space-y-3">
        <div className="grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs mb-1">{t("scheduler.weekLabel")}</label>
            <input className="input" value={week} onChange={(e) => setWeek(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1">{t("scheduler.solver")}</label>
            <select className="input" value={solver} onChange={(e) => setSolver(e.target.value)}>
              <option value="greedy">{t("scheduler.greedy")}</option>
              <option value="pulp" disabled={!status.pulp}>{t("scheduler.pulp")} {status.pulp ? t("scheduler.available") : t("scheduler.unavailable")}</option>
              <option value="ortools" disabled={!status.ortools}>{t("scheduler.ortools")} {status.ortools ? t("scheduler.available") : t("scheduler.unavailable")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">{t("scheduler.slotGroup")}</label>
            <select className="input" value={String(slotGroup)} onChange={(e) => setSlotGroup(parseInt(e.target.value))}>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">{t("scheduler.forbidLabel")}</label>
            <div>
              <input id="forbid" type="checkbox" checked={forbid} onChange={(e) => setForbid(e.target.checked)} />
              <label htmlFor="forbid" className="ml-2 text-sm">{t("scheduler.forbidOn")}</label>
            </div>
          </div>
        </div>
        <div>
          <button className="btn" onClick={runOptimize} disabled={loading}>{t("scheduler.runOptimize")}</button>
        </div>
        {job && (
          <div className="text-sm">
            {t("scheduler.status")}: <span className="text-white/90">{job.status}</span>{" "}
            {job.score != null && <>· {t("scheduler.score")}: {job.score}</>}{" "}
            {job.explain && <div className="mt-1 text-white/70">{job.explain}</div>}
          </div>
        )}
      </div>

      {assignments.length > 0 && (
        <div className="card">
          <div className="font-medium mb-3">{t("scheduler.resultTitle")}</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-3 py-2">{t("scheduler.thead.day")}</th>
                  <th className="text-left px-3 py-2">{t("scheduler.thead.start")}</th>
                  <th className="text-left px-3 py-2">{t("scheduler.thead.end")}</th>
                  <th className="text-left px-3 py-2">{t("scheduler.thead.course")}</th>
                  <th className="text-left px-3 py-2">{t("scheduler.thead.room")}</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i} className="odd:bg-white/0 even:bg-white/5">
                    <td className="px-3 py-2">{a.day}</td>
                    <td className="px-3 py-2">{a.start}</td>
                    <td className="px-3 py-2">{a.end}</td>
                    <td className="px-3 py-2">{a.course_code || ""}</td>
                    <td className="px-3 py-2">{a.room_name || a.room_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
