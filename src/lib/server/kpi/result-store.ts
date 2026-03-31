import { assertValidCompanyKey } from "@/lib/server/shared/source-storage";

import { fileExists, moduleResultAssetPath, readJsonFile, type KpiModuleKey } from "@/lib/server/kpi/shared";

export function isKpiModuleKey(value: string): value is KpiModuleKey {
  return ["crm", "sandbox", "territory", "prescription", "radar"].includes(value);
}

export async function readLatestKpiModuleResult(
  companyKey: string,
  moduleKey: KpiModuleKey
): Promise<Record<string, unknown> | null> {
  assertValidCompanyKey(companyKey);
  const filePath = moduleResultAssetPath(companyKey, moduleKey);
  if (!(await fileExists(filePath))) {
    return null;
  }
  return readJsonFile<Record<string, unknown>>(filePath);
}
