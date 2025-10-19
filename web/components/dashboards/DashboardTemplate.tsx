import Link from "next/link";
import React, { ReactNode } from "react";

type Section = {
  title: string;
  description?: string;
  content?: ReactNode;
  href?: string;
  ctaLabel?: string;
};

type Theme = {
  /** Primary accent color for gradients and borders */
  primary: string;
  /** Secondary accent color blended into header gradient */
  secondary: string;
};

type DashboardTemplateProps = {
  title: string;
  subtitle?: string;
  description?: string;
  theme: Theme;
  actions?: ReactNode;
  sections: Section[];
  footer?: ReactNode;
};

export default function DashboardTemplate({
  title,
  subtitle,
  description,
  theme,
  actions,
  sections,
  footer,
}: DashboardTemplateProps) {
  const sectionBorder = `${theme.primary}33`;
  const sectionGlow = `${theme.primary}1f`;
  const headerGlow = `${theme.secondary}44`;

  return (
    <div className="space-y-6 rounded-3xl border border-white/10 bg-black/30 p-8 shadow-xl backdrop-blur-lg">
      <header
        className="rounded-2xl p-6 text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
          boxShadow: `0 35px 70px -35px ${headerGlow}`,
        }}
      >
        {subtitle && (
          <p className="text-xs uppercase tracking-widest text-white/80">
            {subtitle}
          </p>
        )}
        <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">
            {description}
          </p>
        )}
        {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section, index) => (
          <section
            key={section.title + index.toString()}
            className="rounded-2xl border bg-white/5 p-5 shadow-md"
            style={{
              borderColor: sectionBorder,
              boxShadow: `0 20px 50px -30px ${theme.primary}`,
              background: `linear-gradient(135deg, rgba(8, 12, 24, 0.65), ${sectionGlow})`,
            }}
          >
            <h2 className="text-lg font-semibold text-white">
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-2 text-sm text-white/80">
                {section.description}
              </p>
            )}
            {section.content && (
              <div className="mt-3 text-sm text-white/90">{section.content}</div>
            )}
            {section.href && (
              <Link
                className="btn mt-4 inline-flex w-full justify-center rounded-full px-4 py-2 text-sm"
                href={section.href}
              >
                {section.ctaLabel ?? "바로가기"}
              </Link>
            )}
          </section>
        ))}
      </div>

      {footer && <div className="rounded-2xl border border-white/5 bg-white/5 p-6">{footer}</div>}
    </div>
  );
}
