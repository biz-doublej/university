import Link from "next/link";
import React from "react";

type Section = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref?: string;
};

type StatItem = {
  label: string;
  value: string;
};

type Props = {
  university: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  gradient: { from: string; to: string };
  stats: StatItem[];
  sections: Section[];
};

export default function RoleDashboard({
  university,
  heroTitle,
  heroSubtitle,
  heroDescription,
  gradient,
  stats,
  sections,
}: Props) {
  return (
    <div className="space-y-6">
      <section
        className="rounded-[2.5rem] border border-white/20 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.4)]"
        style={{
          backgroundImage: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.5em] text-white/70">{heroSubtitle}</p>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">{heroTitle}</h1>
            <p className="text-sm text-white/80 md:text-base">{heroDescription}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-black/40 px-5 py-3 text-center text-sm text-white/80">
            <div className="text-sm font-semibold text-white">{university}</div>
            <div className="text-xs uppercase tracking-[0.4em] text-white/60">캠퍼스</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-white/60 shadow-[0_15px_45px_rgba(15,23,42,0.3)]"
          >
            <div className="text-xs uppercase tracking-[0.4em] text-white/50">{stat.label}</div>
            <div className="pt-3 text-2xl font-semibold text-white">{stat.value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <article
            key={section.title}
            className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_60px_rgba(15,23,42,0.4)]"
          >
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-white">{section.title}</h3>
              <p className="text-sm text-white/70">{section.description}</p>
            </div>
            <div className="pt-4">
            <div>
              {section.actionHref ? (
                <Link
                  href={section.actionHref}
                  className="rounded-full border border-white/20 bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  {section.actionLabel}
                </Link>
              ) : (
                <button
                  type="button"
                  className="rounded-full border border-white/20 bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
                >
                  {section.actionLabel}
                </button>
              )}
            </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
