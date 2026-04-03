"use client";

import { useSearchParams } from "next/navigation";

export function HeaderContext() {
  const searchParams = useSearchParams();
  const companyKey = searchParams.get("company")?.trim() || null;

  return (
    <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-2 rounded-md border border-slate-700/50 bg-slate-800 px-3 py-1.5">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-600 text-[10px] font-bold text-white">
          {(companyKey?.charAt(0).toUpperCase() ?? "?")}
        </div>
        <span className="text-sm font-medium text-slate-200">{companyKey ?? "company 선택 필요"}</span>
      </div>
      <span className="rounded bg-emerald-400/10 px-2 py-1 font-mono text-[11px] text-emerald-400">
        ENV: DEV
      </span>
    </div>
  );
}
