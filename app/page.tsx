export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <span className="mb-4 inline-flex w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
          Sales Data OS
        </span>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
          Root-level Next.js scaffold is ready.
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          This project will host the Sales Data OS web console for upload readiness, pipeline
          execution, run tracking, and report delivery.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Frontend</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Next.js 16 + React 19</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Data Layer</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Supabase</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Execution</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Python Polling Worker</p>
          </div>
        </div>
      </section>
    </main>
  );
}
