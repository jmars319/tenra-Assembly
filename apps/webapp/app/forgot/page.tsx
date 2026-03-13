export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ sent?: string; error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const sent = resolvedSearchParams?.sent === "1";
  const error = resolvedSearchParams?.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-white">Reset password</h1>
          <p className="text-sm text-slate-400">We will send a reset link to your email.</p>
        </div>
        {sent ? (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            If the email exists, a reset link has been generated.
          </div>
        ) : null}
        {error ? (
          <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
            Please enter a valid email.
          </div>
        ) : null}
        <form method="POST" action="/api/auth/forgot" className="grid gap-4">
          <label className="grid gap-2 text-sm text-slate-300">
            Email
            <input
              name="email"
              type="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
          >
            Send reset link
          </button>
        </form>
        <div className="mt-4 text-xs text-slate-500">
          <a className="text-slate-300 hover:text-white" href="/login">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
