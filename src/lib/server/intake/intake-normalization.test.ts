import { promises as fs } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";
import { afterEach, describe, expect, it } from "vitest";

import { analyzeIntake } from "@/lib/server/intake/analyze";
import { mergeMonthlyRawSources } from "@/lib/server/intake/monthly-merge";
import { runNormalization } from "@/lib/server/normalization/run";
import { parseTabularFile } from "@/lib/server/shared/tabular-file";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");
const STANDARDIZED_ROOT = path.join(process.cwd(), "data", "standardized");
const TEST_COMPANIES = [
  "test_phase51_blocked",
  "test_phase51_clean",
  "test_phase51_candidate",
  "test_phase51_review",
  "test_phase51_monthly",
  "test_phase51_monthly_suffix",
  "test_phase51_monthly_partial",
  "test_phase51_monthly_invalid",
  "test_phase51_monthly_general",
  "test_phase51_partial_source",
  "test_phase51_rep_hydration",
  "test_phase51_dirty"
];

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

async function removeCompanyArtifacts(companyKey: string): Promise<void> {
  await fs.rm(path.join(COMPANY_SOURCE_ROOT, companyKey), { recursive: true, force: true });
  await fs.rm(path.join(STANDARDIZED_ROOT, companyKey), { recursive: true, force: true });
}

async function writeWorkbook(filePath: string, rows: Record<string, string>[]): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, filePath);
}

async function writeCsv(filePath: string, headers: string[], rows: Record<string, string>[]): Promise<void> {
  await ensureDir(path.dirname(filePath));
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => row[header] ?? "").join(","))
  ];
  await fs.writeFile(filePath, lines.join("\n"), "utf8");
}

async function seedMonthlyWorkbook(
  companyKey: string,
  monthToken: string,
  filename: string,
  rows: Record<string, string>[]
): Promise<void> {
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "monthly_raw", monthToken, filename), rows);
}

async function seedMonthlyCsv(
  companyKey: string,
  monthToken: string,
  filename: string,
  headers: string[],
  rows: Record<string, string>[]
): Promise<void> {
  await writeCsv(path.join(COMPANY_SOURCE_ROOT, companyKey, "monthly_raw", monthToken, filename), headers, rows);
}

async function seedGeneralWorkbook(
  companyKey: string,
  relativePath: string,
  rows: Record<string, string>[]
): Promise<void> {
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, relativePath), rows);
}

async function seedGeneralCsv(
  companyKey: string,
  relativePath: string,
  headers: string[],
  rows: Record<string, string>[]
): Promise<void> {
  await writeCsv(path.join(COMPANY_SOURCE_ROOT, companyKey, relativePath), headers, rows);
}

async function writeUploadIndex(
  companyKey: string,
  uploads: Array<{ sourceKey: string; category: "general" | "monthly"; uploadedAt: string }>
): Promise<void> {
  const onboardingRoot = path.join(COMPANY_SOURCE_ROOT, companyKey, "_onboarding");
  await ensureDir(onboardingRoot);
  await fs.writeFile(
    path.join(onboardingRoot, "source_upload_index.json"),
    JSON.stringify({ companyKey, updatedAt: new Date().toISOString(), uploads }, null, 2),
    "utf8"
  );
}

async function seedCleanIntegratedCompany(companyKey: string): Promise<void> {
  await removeCompanyArtifacts(companyKey);

  await seedGeneralWorkbook(companyKey, path.join("crm", "crm_activity_raw.xlsx"), [
    { "실행일": "2025-04-03", "담당자명": "김영업", "병원명": "테스트병원A", "액션유형": "visit" }
  ]);
  await seedGeneralWorkbook(companyKey, path.join("sales", "sales_raw.xlsx"), [
    {
      "매출월": "2025-04",
      "병원코드": "ACC001",
      "브랜드코드": "P001",
      "매출금액": "1000"
    }
  ]);
  await seedGeneralWorkbook(companyKey, path.join("sales", "target_raw.xlsx"), [
    { "목표월": "2025-04", "목표금액": "1500" }
  ]);
  await seedGeneralCsv(
    companyKey,
    path.join("prescription", "prescription_raw.csv"),
    ["출고일", "약국명", "brand", "출고수량"],
    [{ "출고일": "2025-04-03", "약국명": "테스트약국", "brand": "P001", "출고수량": "3" }]
  );
  await seedGeneralWorkbook(companyKey, path.join("company", "account_master.xlsx"), [
    {
      "account_id": "ACC001",
      "account_name": "테스트병원A",
      "branch_id": "B01",
      "branch_name": "서울지점",
      "rep_id": "R001",
      "rep_name": "김영업"
    }
  ]);
  await seedGeneralWorkbook(companyKey, path.join("crm", "crm_rep_master.xlsx"), [
    { "rep_id": "R001", "rep_name": "김영업", "branch_id": "B01", "branch_name": "서울지점" }
  ]);
  await seedGeneralWorkbook(companyKey, path.join("crm", "crm_account_assignment.xlsx"), [
    {
      "account_id": "ACC001",
      "account_name": "테스트병원A",
      "branch_id": "B01",
      "branch_name": "서울지점",
      "rep_id": "R001",
      "rep_name": "김영업"
    }
  ]);
  await seedGeneralCsv(
    companyKey,
    path.join("crm", "crm_rules.csv"),
    ["metric_code", "metric_name", "formula_expression", "metric_version"],
    [{ "metric_code": "ACT", "metric_name": "활동수", "formula_expression": "count(activity)", "metric_version": "v1" }]
  );
}

async function seedDirtyIntegratedCompany(companyKey: string): Promise<void> {
  await removeCompanyArtifacts(companyKey);

  await seedMonthlyWorkbook(companyKey, "202504", "crm_activity_raw.xlsx", [
    { "실행일": "2025-04-03", "담당자명": "김영업", "병원명": "테스트병원A", "액션유형": "visit" }
  ]);
  await seedMonthlyWorkbook(companyKey, "202505", "crm_activity_raw.xlsx", [
    { "실행일": "2025-05-07", "담당자명": "김영업", "병원명": "테스트병원A", "액션유형": "call" }
  ]);

  await seedMonthlyWorkbook(companyKey, "202504", "sales_raw.xlsx", [
    {
      "매출월": "2025-04",
      "병원코드": "ACC001",
      "병원명": "테스트병원A",
      "브랜드코드": "P001",
      "매출금액": "1000",
      "본부코드": "B01",
      "본부명": "서울지점",
      "영업사원코드": "R001",
      "영업사원명": "김영업"
    },
    {
      "매출월": "2025-04",
      "병원코드": "ACC001",
      "병원명": "테스트병원A",
      "브랜드코드": "P001",
      "매출금액": "1000",
      "본부코드": "B01",
      "본부명": "서울지점",
      "영업사원코드": "R001",
      "영업사원명": "김영업"
    }
  ]);
  await seedMonthlyWorkbook(companyKey, "202505", "sales_raw.xlsx", [
    {
      "매출월": "2025-05",
      "병원코드": "ACC001",
      "병원명": "테스트병원A",
      "브랜드코드": "P001",
      "매출금액": "1100",
      "본부코드": "B01",
      "본부명": "서울지점",
      "영업사원코드": "R001",
      "영업사원명": "김영업"
    }
  ]);

  await seedMonthlyWorkbook(companyKey, "202504", "target_raw.xlsx", [
    { "목표월": "2025-04", "목표금액": "1500" },
    { "목표월": "2025-04", "목표금액": "1500" }
  ]);
  await seedMonthlyWorkbook(companyKey, "202505", "target_raw.xlsx", [
    { "목표월": "2025-05", "목표금액": "1600" }
  ]);

  await seedMonthlyCsv(
    companyKey,
    "202504",
    "prescription_raw.csv",
    ["출고일", "약국명", "brand", "출고수량"],
    [
      { "출고일": "2025-04-03", "약국명": "테스트약국", "brand": "P001", "출고수량": "3" },
      { "출고일": "2025-04-03", "약국명": "테스트약국", "brand": "P001", "출고수량": "3" }
    ]
  );
  await seedMonthlyCsv(
    companyKey,
    "202505",
    "prescription_raw.csv",
    ["출고일", "약국명", "brand", "출고수량"],
    [{ "출고일": "2025-05-11", "약국명": "테스트약국", "brand": "P001", "출고수량": "4" }]
  );

  await seedGeneralWorkbook(companyKey, path.join("company", "account_master.xlsx"), [
    { "branch_id": "B01", "branch_name": "서울지점", "rep_id": "R001", "rep_name": "김영업" }
  ]);
  await seedGeneralWorkbook(companyKey, path.join("crm", "crm_rep_master.xlsx"), [
    { "rep_id": "R001", "rep_name": "김영업", "branch_id": "B01", "branch_name": "서울지점" }
  ]);
  await seedGeneralWorkbook(companyKey, path.join("crm", "crm_account_assignment.xlsx"), [
    { "branch_id": "B01", "branch_name": "서울지점", "rep_id": "R001", "rep_name": "김영업" }
  ]);
  await seedGeneralCsv(
    companyKey,
    path.join("crm", "crm_rules.csv"),
    ["metric_code", "metric_name", "formula_expression", "metric_version"],
    [{ "metric_code": "ACT", "metric_name": "활동수", "formula_expression": "count(activity)", "metric_version": "v1" }]
  );
}

afterEach(async () => {
  await Promise.all(TEST_COMPANIES.map((companyKey) => removeCompanyArtifacts(companyKey)));
});

describe("Phase 5-1 backend flow", () => {
  it("blocks when a required source is missing", async () => {
    const result = await analyzeIntake({
      companyKey: "test_phase51_blocked",
      executionMode: "prescription"
    });

    expect(result.status).toBe("blocked");
    expect(result.ready_for_adapter).toBe(false);
    expect(result.findings.some((finding) => finding.message.includes("prescription 필수 입력이 없습니다"))).toBe(true);
  });

  it("passes clean raw as ready", async () => {
    const companyKey = "test_phase51_clean";
    await seedCleanIntegratedCompany(companyKey);

    const result = await analyzeIntake({
      companyKey,
      executionMode: "integrated"
    });

    expect(result.status).toBe("ready");
    expect(result.ready_for_adapter).toBe(true);
    expect(result.analysis_start_month).toBe("202504");
    expect(result.analysis_end_month).toBe("202504");
  });

  it("keeps running with candidate suggestions", async () => {
    const companyKey = "test_phase51_candidate";
    await seedDirtyIntegratedCompany(companyKey);
    await seedMonthlyWorkbook(companyKey, "202504", "target_raw.xlsx", [
      { "목표월": "2025-04", "목표금액후보": "1500" }
    ]);
    await seedMonthlyWorkbook(companyKey, "202505", "target_raw.xlsx", [
      { "목표월": "2025-05", "목표금액후보": "1600" }
    ]);

    const result = await analyzeIntake({
      companyKey,
      executionMode: "integrated"
    });

    expect(result.status).toBe("ready_with_fixes");
    expect(
      result.findings.some(
        (finding) => finding.sourceKey === "target" && finding.message.includes("후보 컬럼")
      )
    ).toBe(true);
  });

  it("moves to needs_review when no candidate exists for a required meaning column", async () => {
    const companyKey = "test_phase51_review";
    await seedDirtyIntegratedCompany(companyKey);
    await seedMonthlyWorkbook(companyKey, "202504", "target_raw.xlsx", [
      { "목표월": "2025-04", "엉뚱한열": "1500" }
    ]);
    await seedMonthlyWorkbook(companyKey, "202505", "target_raw.xlsx", [
      { "목표월": "2025-05", "엉뚱한열": "1600" }
    ]);

    const result = await analyzeIntake({
      companyKey,
      executionMode: "integrated"
    });

    expect(result.status).toBe("needs_review");
    expect(result.ready_for_adapter).toBe(false);
    expect(
      result.findings.some(
        (finding) => finding.sourceKey === "target" && finding.message.includes("컬럼 매핑 검토")
      )
    ).toBe(true);
  });

  it("merges monthly raw files into the official raw path", async () => {
    const companyKey = "test_phase51_monthly";

    await seedMonthlyWorkbook(companyKey, "202504", "sales_raw.xlsx", [
      { "매출월": "2025-04", "병원코드": "ACC001", "브랜드코드": "P001", "매출금액": "1000" }
    ]);
    await seedMonthlyWorkbook(companyKey, "202505", "sales_raw.xlsx", [
      { "매출월": "2025-05", "병원코드": "ACC001", "브랜드코드": "P001", "매출금액": "1100" }
    ]);

    const result = await mergeMonthlyRawSources({ companyKey });
    const salesSummary = result.source_summaries.find((summary) => summary.sourceKey === "sales");
    const mergedPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "sales", "sales_raw.xlsx");
    const parsedMerged = await parseTabularFile(mergedPath);

    expect(salesSummary?.status).toBe("merged");
    expect(salesSummary?.monthCount).toBe(2);
    expect(salesSummary?.monthlyTotalRowCount).toBe(2);
    expect(salesSummary?.mergedRowCountMatchesMonthlyTotal).toBe(true);
    expect(result.months_detected).toEqual(["202504", "202505"]);
    expect(parsedMerged.rows).toHaveLength(2);
  });

  it("accepts monthly filenames with the same month suffix", async () => {
    const companyKey = "test_phase51_monthly_suffix";

    await seedMonthlyWorkbook(companyKey, "202504", "sales_raw_202504.xlsx", [
      { "매출월": "2025-04", "병원코드": "ACC001", "브랜드코드": "P001", "매출금액": "1000" }
    ]);
    await seedMonthlyWorkbook(companyKey, "202505", "sales_raw202505.xlsx", [
      { "매출월": "2025-05", "병원코드": "ACC001", "브랜드코드": "P001", "매출금액": "1100" }
    ]);

    const result = await mergeMonthlyRawSources({ companyKey, sourceKeys: ["sales"] });
    const salesSummary = result.source_summaries.find((summary) => summary.sourceKey === "sales");
    const mergedPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "sales", "sales_raw.xlsx");
    const parsedMerged = await parseTabularFile(mergedPath);

    expect(salesSummary?.status).toBe("merged");
    expect(salesSummary?.files).toEqual([
      "data/company_source/test_phase51_monthly_suffix/monthly_raw/202504/sales_raw_202504.xlsx",
      "data/company_source/test_phase51_monthly_suffix/monthly_raw/202505/sales_raw202505.xlsx"
    ]);
    expect(parsedMerged.rows).toHaveLength(2);
  });

  it("merges only the months that actually have source files", async () => {
    const companyKey = "test_phase51_monthly_partial";

    await seedMonthlyWorkbook(companyKey, "202504", "target_raw_202504.xlsx", [
      { "목표월": "2025-04", "목표금액": "1500" }
    ]);
    await ensureDir(path.join(COMPANY_SOURCE_ROOT, companyKey, "monthly_raw", "202505"));

    const result = await mergeMonthlyRawSources({ companyKey, sourceKeys: ["target"] });
    const targetSummary = result.source_summaries.find((summary) => summary.sourceKey === "target");
    const mergedPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "sales", "target_raw.xlsx");
    const parsedMerged = await parseTabularFile(mergedPath);

    expect(result.months_detected).toEqual(["202504", "202505"]);
    expect(targetSummary?.monthCount).toBe(1);
    expect(targetSummary?.months).toEqual(["202504"]);
    expect(parsedMerged.rows).toHaveLength(1);
  });

  it("marks absent monthly sources as no_monthly_files", async () => {
    const companyKey = "test_phase51_partial_source";

    await seedMonthlyWorkbook(companyKey, "202504", "sales_raw.xlsx", [
      { "매출월": "2025-04", "병원코드": "ACC001", "브랜드코드": "P001", "매출금액": "1000" }
    ]);

    const result = await mergeMonthlyRawSources({ companyKey });
    const targetSummary = result.source_summaries.find((summary) => summary.sourceKey === "target");

    expect(targetSummary?.status).toBe("no_monthly_files");
    expect(targetSummary?.monthCount).toBe(0);
  });

  it("ignores files with the right base name but wrong extension", async () => {
    const companyKey = "test_phase51_monthly_invalid";

    await ensureDir(path.join(COMPANY_SOURCE_ROOT, companyKey, "monthly_raw", "202504"));
    await fs.writeFile(
      path.join(COMPANY_SOURCE_ROOT, companyKey, "monthly_raw", "202504", "sales_raw_202504.txt"),
      "dummy",
      "utf8"
    );

    const result = await mergeMonthlyRawSources({ companyKey, sourceKeys: ["sales"] });
    const salesSummary = result.source_summaries.find((summary) => summary.sourceKey === "sales");

    expect(salesSummary?.status).toBe("no_monthly_files");
  });

  it("prefers direct general upload over monthly merge when general upload is newer", async () => {
    const companyKey = "test_phase51_monthly_general";

    await seedMonthlyWorkbook(companyKey, "202504", "sales_raw_202504.xlsx", [
      { "매출월": "2025-04", "병원코드": "ACC001", "브랜드코드": "P001", "매출금액": "1000" }
    ]);
    await seedGeneralWorkbook(companyKey, path.join("sales", "sales_raw.xlsx"), [
      { "매출월": "2025-04", "병원코드": "ACC999", "브랜드코드": "P999", "매출금액": "9999" }
    ]);
    await writeUploadIndex(companyKey, [
      { sourceKey: "sales", category: "monthly", uploadedAt: "2026-03-31T00:00:00.000Z" },
      { sourceKey: "sales", category: "general", uploadedAt: "2026-03-31T01:00:00.000Z" }
    ]);

    const result = await mergeMonthlyRawSources({ companyKey, sourceKeys: ["sales"] });
    const salesSummary = result.source_summaries.find((summary) => summary.sourceKey === "sales");
    const mergedPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "sales", "sales_raw.xlsx");
    const parsedMerged = await parseTabularFile(mergedPath);

    expect(salesSummary?.status).toBe("skipped");
    expect(salesSummary?.message).toContain("일반 업로드 raw가 더 우선");
    expect(parsedMerged.rows[0]?.["병원코드"]).toBe("ACC999");
  });

  it("hydrates crm_rep_master from support sources when rep master is weak", async () => {
    const companyKey = "test_phase51_rep_hydration";
    await seedDirtyIntegratedCompany(companyKey);
    await seedGeneralWorkbook(companyKey, path.join("crm", "crm_rep_master.xlsx"), [
      { "지점명": "서울지점" }
    ]);

    const intakeResult = await analyzeIntake({
      companyKey,
      executionMode: "integrated"
    });
    const normalizationResult = await runNormalization({
      companyKey,
      executionMode: "integrated"
    });

    const repMasterSource = normalizationResult.source_results.find((item) => item.sourceKey === "crm_rep_master");

    expect(intakeResult.status).toBe("ready_with_fixes");
    expect(repMasterSource?.mappedColumns.rep_id).toBe("derived_from_support_sources");
    expect(repMasterSource?.appliedFixes.some((fix) => fix.includes("담당자 마스터"))).toBe(true);
  });

  it("keeps dirty raw flowing through intake and normalization with fix records", async () => {
    const companyKey = "test_phase51_dirty";
    await seedDirtyIntegratedCompany(companyKey);

    const intakeResult = await analyzeIntake({
      companyKey,
      executionMode: "integrated"
    });

    expect(intakeResult.status).toBe("ready_with_fixes");
    expect(intakeResult.ready_for_adapter).toBe(true);
    expect(intakeResult.analysis_start_month).toBe("202504");
    expect(intakeResult.analysis_end_month).toBe("202505");
    expect(
      intakeResult.packages.find((item) => item.sourceKey === "account_master")?.fixes.some((fix) => fix.includes("실행용 보강"))
    ).toBe(true);

    const normalizationResult = await runNormalization({
      companyKey,
      executionMode: "integrated"
    });

    expect(normalizationResult.status).toBe("completed_with_review");

    const salesSource = normalizationResult.source_results.find((item) => item.sourceKey === "sales");
    const accountMasterSource = normalizationResult.source_results.find((item) => item.sourceKey === "account_master");
    expect(salesSource?.appliedFixes.some((fix) => fix.includes("중복 행"))).toBe(true);
    expect(accountMasterSource?.mappedColumns.account_id).toBe("derived_from_support_sources");

    const salesStagingPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "_intake_staging", "sales.json");
    const salesStaging = JSON.parse(await fs.readFile(salesStagingPath, "utf8")) as {
      applied_fixes: string[];
      rows: Array<Record<string, string>>;
    };
    expect(salesStaging.applied_fixes.some((fix) => fix.includes("중복 행"))).toBe(true);
    expect(salesStaging.rows).toHaveLength(2);
    expect(salesStaging.rows[0]?.period).toBe("202504");

    const prescriptionStagingPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "_intake_staging", "prescription.json");
    const prescriptionStaging = JSON.parse(await fs.readFile(prescriptionStagingPath, "utf8")) as {
      rows: Array<Record<string, string>>;
    };
    expect(prescriptionStaging.rows[0]?.ship_date).toBe("2025-04-03");

    const registryPath = path.join(COMPANY_SOURCE_ROOT, companyKey, "_onboarding", "column_mapping_registry.json");
    const registry = JSON.parse(await fs.readFile(registryPath, "utf8")) as {
      source_mappings: Record<string, { derived_columns: string[] }>;
    };
    expect(registry.source_mappings.account_master.derived_columns).toContain("account_id");
    expect(registry.source_mappings.crm_account_assignment.derived_columns).toContain("account_name");
  });
});
