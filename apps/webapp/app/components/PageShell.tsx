import TopNav from "./TopNav";
import type { FeatureKey } from "@prisma/client";

export default function PageShell({
  title,
  subtitle,
  actions,
  workspaceName,
  isAdmin,
  features,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  workspaceName?: string;
  isAdmin?: boolean;
  features?: Partial<Record<FeatureKey, boolean>>;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <TopNav workspaceName={workspaceName} isAdmin={isAdmin} features={features} />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-white">{title}</h1>
            {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
          </div>
          {actions ? <div className="pt-1">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
