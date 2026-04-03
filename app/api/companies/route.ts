import { NextResponse } from "next/server";
import { z } from "zod";

import { createCompany, listCompanyOptions } from "@/lib/server/console/company-context";
import { logError, logInfo } from "@/lib/server/shared/ops-log";

export const runtime = "nodejs";

const createCompanySchema = z.object({
  company_name: z.string().trim().min(1, "회사 이름을 입력해 주세요."),
  status: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export async function GET() {
  try {
    const companies = await listCompanyOptions();
    logInfo({
      event: "companies.list.success",
      route: "/api/companies",
      meta: { count: companies.length },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load companies.";
    logError({
      event: "companies.list.failed",
      route: "/api/companies",
      detail: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = createCompanySchema.parse(await request.json());
    const company = await createCompany({
      companyName: body.company_name,
      status: body.status,
      notes: body.notes,
    });
    logInfo({
      event: "companies.create.success",
      route: "/api/companies",
      companyKey: company.companyKey,
      detail: company.companyName,
    });

    return NextResponse.json({
      ok: true,
      company: {
        company_key: company.companyKey,
        company_name: company.companyName,
        status: company.status,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create company.";
    logError({
      event: "companies.create.failed",
      route: "/api/companies",
      detail: message,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
