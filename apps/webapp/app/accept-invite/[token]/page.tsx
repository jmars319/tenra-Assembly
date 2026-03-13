export default async function AcceptInviteTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-white">Accept invite</h1>
          <p className="text-sm text-slate-400">Set a password to activate your account.</p>
        </div>
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            Invite is invalid or expired.
          </div>
        ) : null}
        <form method="POST" action="/api/auth/accept-invite" className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          <label className="grid gap-2 text-sm text-slate-300">
            Password
            <input
              name="password"
              type="password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
          >
            Accept invite
          </button>
        </form>
      </div>
    </div>
  );
}
