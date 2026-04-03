import { describe, expect, it } from "vitest";

describe("/api/companies/[companyKey]/files route", () => {
  it("rejects path outside allowed company folders", async () => {
    const route = await import("./route");
    const request = new Request(
      "http://localhost/api/companies/123456/files?path=data/validation/other_company/file.json",
    );

    const response = await route.GET(request, {
      params: Promise.resolve({ companyKey: "123456" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("허용되지 않은 파일 경로");
  });
});
