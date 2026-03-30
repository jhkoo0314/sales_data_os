type Tone = "ready" | "running" | "pass" | "warn" | "fail" | "approved" | "generated";

const toneClassName: Record<Tone, string> = {
  ready: "bg-slate-100 text-slate-700 border-slate-200",
  running: "bg-sky-100 text-sky-700 border-sky-200",
  pass: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warn: "bg-amber-100 text-amber-700 border-amber-200",
  fail: "bg-rose-100 text-rose-700 border-rose-200",
  approved: "bg-teal-100 text-teal-700 border-teal-200",
  generated: "bg-cyan-100 text-cyan-700 border-cyan-200"
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${toneClassName[tone]}`}
    >
      {children}
    </span>
  );
}
