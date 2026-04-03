import { Building2 } from "lucide-react";

import { CompanyRegistryPanel } from "@/components/company-registry-panel";
import type { CompanyOption } from "@/lib/server/console/company-context";

export function CompanySelectionRequired({
  companies,
  returnPath = "/workspace",
  title = "회사를 먼저 선택해 주세요",
  description = "이 화면은 company_key 문맥이 있어야 열 수 있습니다. 아래 회사 목록에서 하나를 선택해 주세요.",
}: {
  companies: CompanyOption[];
  returnPath?: string;
  title?: string;
  description?: string;
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
          </div>
        </div>
      </section>

      <CompanyRegistryPanel companies={companies} returnPath={returnPath} title="등록된 회사" />
    </div>
  );
}
