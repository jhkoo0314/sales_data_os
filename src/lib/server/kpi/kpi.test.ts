import { promises as fs } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";
import { afterEach, describe, expect, it } from "vitest";

import { readLatestKpiModuleResult, readLatestKpiResult, runKpi } from "@/lib/server/kpi";

const COMPANY_SOURCE_ROOT = path.join(process.cwd(), "data", "company_source");
const STANDARDIZED_ROOT = path.join(process.cwd(), "data", "standardized");
const VALIDATION_ROOT = path.join(process.cwd(), "data", "validation");
const TEST_COMPANIES = ["test_phase6_clean"];

async function ensureDir(targetPath: string): Promise<void> {
  await fs.mkdir(targetPath, { recursive: true });
}

async function removeCompanyArtifacts(companyKey: string): Promise<void> {
  await fs.rm(path.join(COMPANY_SOURCE_ROOT, companyKey), { recursive: true, force: true });
  await fs.rm(path.join(STANDARDIZED_ROOT, companyKey), { recursive: true, force: true });
  await fs.rm(path.join(VALIDATION_ROOT, companyKey), { recursive: true, force: true });
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
  const lines = [headers.join(","), ...rows.map((row) => headers.map((header) => row[header] ?? "").join(","))];
  await fs.writeFile(filePath, lines.join("\n"), "utf8");
}

async function seedCompany(companyKey: string): Promise<void> {
  await removeCompanyArtifacts(companyKey);
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "crm", "crm_activity_raw.xlsx"), [
    {
      "실행일": "2025-04-03",
      "영업사원코드": "R001",
      "담당자명": "김영업",
      "병원코드": "ACC001",
      "병원명": "테스트병원A",
      "액션유형": "visit",
      "차기액션": "재방문 예정",
      "신뢰등급": "verified",
      "정서점수": "0.90",
      "품질계수": "0.8",
      "영향계수": "0.9",
      "행동가중치": "1.0",
      "가중활동점수": "0.72",
      "상세콜여부": "Y",
      "방문횟수": "1"
    }
  ]);
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "sales", "sales_raw.xlsx"), [
    {
      "매출월": "2025-04",
      "병원코드": "ACC001",
      "병원명": "테스트병원A",
      "브랜드코드": "P001",
      "제품명": "테스트제품",
      "매출금액": "1000",
      "매출수량": "10",
      "본부코드": "B01",
      "본부명": "서울지점",
      "영업사원코드": "R001",
      "영업사원명": "김영업"
    }
  ]);
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "sales", "target_raw.xlsx"), [
    {
      "목표월": "2025-04",
      "병원코드": "ACC001",
      "병원명": "테스트병원A",
      "브랜드코드": "P001",
      "제품명": "테스트제품",
      "목표금액": "1500",
      "본부코드": "B01",
      "본부명": "서울지점",
      "영업사원코드": "R001",
      "영업사원명": "김영업"
    }
  ]);
  await writeCsv(
    path.join(COMPANY_SOURCE_ROOT, companyKey, "prescription", "prescription_raw.csv"),
    ["출고일", "약국명", "brand", "출고수량"],
    [{ "출고일": "2025-04-05", "약국명": "테스트약국", brand: "P001", "출고수량": "3" }]
  );
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "crm", "crm_rep_master.xlsx"), [
    { rep_id: "R001", rep_name: "김영업", branch_id: "B01", branch_name: "서울지점" }
  ]);
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "crm", "crm_account_assignment.xlsx"), [
    {
      account_id: "ACC001",
      account_name: "테스트병원A",
      branch_id: "B01",
      branch_name: "서울지점",
      rep_id: "R001",
      rep_name: "김영업"
    }
  ]);
  await writeWorkbook(path.join(COMPANY_SOURCE_ROOT, companyKey, "company", "account_master.xlsx"), [
    {
      account_id: "ACC001",
      account_name: "테스트병원A",
      branch_id: "B01",
      branch_name: "서울지점",
      rep_id: "R001",
      rep_name: "김영업"
    }
  ]);
  await writeCsv(
    path.join(COMPANY_SOURCE_ROOT, companyKey, "crm", "crm_rules.csv"),
    ["metric_code", "metric_name", "formula_expression", "metric_version"],
    [{ metric_code: "ACT", metric_name: "활동수", formula_expression: "count(activity)", metric_version: "v1" }]
  );
}

afterEach(async () => {
  await Promise.all(TEST_COMPANIES.map((companyKey) => removeCompanyArtifacts(companyKey)));
});

describe("kpi module flow", () => {
  it("creates CRM and Sandbox result assets for a clean company", async () => {
    const companyKey = "test_phase6_clean";
    await seedCompany(companyKey);

    const result = await runKpi({ companyKey, executionMode: "integrated" });
    const crmAssetPath = path.join(VALIDATION_ROOT, companyKey, "crm", "crm_result_asset.json");
    const sandboxAssetPath = path.join(VALIDATION_ROOT, companyKey, "sandbox", "sandbox_result_asset.json");
    const territoryAssetPath = path.join(VALIDATION_ROOT, companyKey, "territory", "territory_result_asset.json");
    const prescriptionAssetPath = path.join(
      VALIDATION_ROOT,
      companyKey,
      "prescription",
      "prescription_result_asset.json"
    );
    const radarAssetPath = path.join(VALIDATION_ROOT, companyKey, "radar", "radar_result_asset.json");

    expect(["completed", "completed_with_review"]).toContain(result.status);
    expect(result.module_results).toHaveLength(5);
    expect(result.module_results[0]?.module).toBe("crm");
    expect(result.module_results[1]?.module).toBe("sandbox");
    expect(result.module_results[2]?.module).toBe("territory");
    expect(result.module_results[3]?.module).toBe("prescription");
    expect(result.module_results[4]?.module).toBe("radar");
    await expect(fs.access(crmAssetPath)).resolves.toBeUndefined();
    await expect(fs.access(sandboxAssetPath)).resolves.toBeUndefined();
    await expect(fs.access(territoryAssetPath)).resolves.toBeUndefined();
    await expect(fs.access(prescriptionAssetPath)).resolves.toBeUndefined();
    await expect(fs.access(radarAssetPath)).resolves.toBeUndefined();
  });

  it("reads the latest KPI result for company_000002", async () => {
    const result = await runKpi({ companyKey: "company_000002", executionMode: "integrated" });
    const latest = await readLatestKpiResult("company_000002");
    const radarResult = await readLatestKpiModuleResult("company_000002", "radar");

    expect(result.module_results.some((item) => item.module === "crm")).toBe(true);
    expect(result.module_results.some((item) => item.module === "sandbox")).toBe(true);
    expect(result.module_results.some((item) => item.module === "territory")).toBe(true);
    expect(result.module_results.some((item) => item.module === "prescription")).toBe(true);
    expect(result.module_results.some((item) => item.module === "radar")).toBe(true);
    expect(latest?.company_key).toBe("company_000002");
    expect(latest?.module_results).toHaveLength(5);
    expect(radarResult?.asset_type).toBe("radar_result_asset");
  });
});
