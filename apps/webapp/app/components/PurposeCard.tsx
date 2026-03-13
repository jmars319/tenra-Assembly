export default function PurposeCard({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
      <div className="text-xs uppercase tracking-wide text-slate-500">Purpose</div>
      <div className="mt-2 text-sm text-slate-200">{children}</div>
    </div>
  );
}
