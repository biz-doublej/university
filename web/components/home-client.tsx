"use client";

import Link from "next/link";
import { useI18n } from "./i18n";

export function HomeClient() {
  const { t } = useI18n();
  const features = [
    {
      title: t("home.feature1Title"),
      description: t("home.feature1Desc"),
      accent: "from-[#14b8a6]/20 to-transparent",
    },
    {
      title: t("home.feature2Title"),
      description: t("home.feature2Desc"),
      accent: "from-[#6366f1]/20 to-transparent",
    },
    {
      title: t("home.feature3Title"),
      description: t("home.feature3Desc"),
      accent: "from-[#f97316]/20 to-transparent",
    },
  ];

  const metrics = [
    { label: t("home.metric1Label"), value: t("home.metric1Value") },
    { label: t("home.metric2Label"), value: t("home.metric2Value") },
    { label: t("home.metric3Label"), value: t("home.metric3Value") },
  ];
  const services = ["Eduscope", "CampusON", "DoubleJ"];

  return (
    <div className="space-y-12 py-10">
      <section className="space-y-5 text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-white/40">{t("home.topLabel")}</p>
        <h1 className="text-4xl font-semibold md:text-5xl">{t("home.heroTitle")}</h1>
        <p className="mx-auto max-w-3xl text-base text-white/70 md:text-lg">{t("home.heroDescription")}</p>
        <p className="text-sm text-white/60">{t("home.heroHint")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Link className="btn px-7 py-3 text-sm font-semibold" href="/login">
            {t("home.loginCta")}
          </Link>
          <Link className="btn text-sm font-semibold px-7 py-3" href="/signup">
            {t("home.signupCta")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.title}
            className={`relative space-y-3 rounded-2xl border border-white/10 bg-gradient-to-br ${feature.accent} p-5 shadow-[0_0_30px_rgba(15,23,42,0.45)]`}
          >
            <div className="text-sm font-semibold text-white/70">{t("home.featureLabel")}</div>
            <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
            <p className="text-sm text-white/70">{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_10px_60px_rgba(15,23,42,0.4)] md:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-white">{t("home.impactTitle")}</h3>
          <p className="text-sm text-white/70">{t("home.impactDescription")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="text-sm font-medium uppercase text-white/50">{metric.label}</div>
              <div className="text-2xl font-semibold text-white">{metric.value}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-white/70">{t("home.secondaryPrompt")}</p>
          <div className="text-sm text-white/80">{t("home.secondaryHint")}</div>
          <Link className="btn mt-3 text-sm font-semibold px-5 py-2" href="/login">
            {t("home.loginCta")}
          </Link>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_15px_50px_rgba(15,23,42,0.45)]">
        <div>
          <h3 className="text-lg font-semibold text-white">{t("home.servicesTitle")}</h3>
          <p className="text-sm text-white/70">{t("home.servicesDescription")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {services.map((service) => (
            <div key={service} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-sm font-semibold text-white">
              {service}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
