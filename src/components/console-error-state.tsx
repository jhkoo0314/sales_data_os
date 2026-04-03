"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

export function ConsoleErrorState({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sales-os-ui]", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <TriangleAlert className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">화면을 열지 못했습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          잠시 후 다시 시도해 주세요. 계속 같은 문제가 나면 회사 선택, Supabase 연결, 결과 파일 존재 여부를 함께 확인하면 됩니다.
        </p>
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          {error.message || "알 수 없는 오류가 발생했습니다."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          <RotateCcw className="h-4 w-4" />
          다시 시도
        </button>
      </div>
    </div>
  );
}
