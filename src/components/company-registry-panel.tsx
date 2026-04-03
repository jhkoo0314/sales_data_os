"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ChevronRight, LoaderCircle, Plus } from "lucide-react";

import type { CompanyOption } from "@/lib/server/console/company-context";

function withCompany(href: string, companyKey: string) {
  return `${href}?company=${encodeURIComponent(companyKey)}`;
}

export function CompanyRegistryPanel({
  companies,
  returnPath = "/workspace",
  selectedCompanyKey,
  title = "회사 선택",
  emptyMessage = "아직 등록된 회사가 없습니다. 아래에서 새 회사를 먼저 등록해 주세요.",
}: {
  companies: CompanyOption[];
  returnPath?: string;
  selectedCompanyKey?: string | null;
  title?: string;
  emptyMessage?: string;
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreateCompany() {
    const trimmed = companyName.trim();
    if (!trimmed) {
      setError("회사 이름을 먼저 입력해 주세요.");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/companies", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            company_name: trimmed,
          }),
        });

        const payload = (await response.json()) as {
          company?: { company_key?: string };
          error?: string;
        };

        if (!response.ok || !payload.company?.company_key) {
          throw new Error(payload.error ?? "회사 등록에 실패했습니다.");
        }

        router.push(withCompany(returnPath, payload.company.company_key));
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "회사 등록 중 문제가 생겼습니다.",
        );
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Building2 className="h-[18px] w-[18px] text-slate-400" />
          {title}
        </h3>
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
          {companies.length} companies
        </span>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-bold text-slate-900">새 회사 등록</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          회사 이름만 입력하면 서버가 랜덤 6자리 숫자 `company_key`를 자동으로 만듭니다.
        </p>
        <div className="mt-4 flex gap-3">
          <input
            type="text"
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="예: 신규제약"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300"
          />
          <button
            type="button"
            onClick={handleCreateCompany}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            등록
          </button>
        </div>
        {error ? (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </div>
        ) : null}
      </div>

      {companies.length > 0 ? (
        <div className="space-y-3">
          {companies.map((company) => {
            const selected = selectedCompanyKey === company.companyKey;
            return (
              <Link
                key={company.companyKey}
                href={withCompany(returnPath, company.companyKey)}
                className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                  selected
                    ? "border-sky-200 bg-sky-50"
                    : "border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-white"
                }`}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">{company.companyName}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">{company.companyKey}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
