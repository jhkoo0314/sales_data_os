import { describe, expect, it } from "vitest";

import { readLatestValidationSummary, runValidation } from "@/lib/server/validation";

const COMPANIES = ["company_000002", "daon_pharma", "monthly_merge_pharma"] as const;

describe("validation run for three companies", () => {
  for (const companyKey of COMPANIES) {
    it(`runs validation for ${companyKey}`, async () => {
      const result = await runValidation({ companyKey, executionMode: "integrated" });
      const latest = await readLatestValidationSummary(companyKey);

      expect(result.company_key).toBe(companyKey);
      expect(result.run_id).toBeTruthy();
      expect(result.steps.length).toBeGreaterThanOrEqual(5);
      expect(latest?.company_key).toBe(companyKey);
      expect(latest?.run_id).toBeTruthy();
    });
  }
});
