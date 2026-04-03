import { LoaderCircle } from "lucide-react";

export function ConsoleLoading({
  title = "화면을 준비하고 있습니다",
  description = "현재 회사와 결과 파일 문맥을 읽는 중입니다.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
        <h1 className="mt-5 text-xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
    </div>
  );
}
