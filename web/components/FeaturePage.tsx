import React from "react";

type Detail = {
  title: string;
  description: string;
};

type Props = {
  heading: string;
  description: string;
  details?: Detail[];
  children?: React.ReactNode;
};

export default function FeaturePage({ heading, description, details, children }: Props) {
  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl shadow-black/40">
        <h1 className="text-3xl font-semibold text-white">{heading}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">{description}</p>
      </header>

      {details && details.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {details.map((detail) => (
            <article
              key={detail.title}
              className="rounded-2xl border border-white/10 bg-black/40 p-6 shadow-lg shadow-black/30"
            >
              <h2 className="text-lg font-semibold text-white">{detail.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/75">{detail.description}</p>
            </article>
          ))}
        </div>
      )}

      {children && <div className="rounded-2xl border border-white/10 bg-black/30 p-6">{children}</div>}
    </div>
  );
}
