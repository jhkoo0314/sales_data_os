import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/console/company-context", () => ({
  createCompany: vi.fn(),
  listCompanyOptions: vi.fn(),
}));

describe("/api/companies route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns companies on GET", async () => {
    const module = await import("@/lib/server/console/company-context");
    vi.mocked(module.listCompanyOptions).mockResolvedValue([
      { companyKey: "123456", companyName: "테스트제약", status: "active" },
    ]);

    const route = await import("./route");
    const response = await route.GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.companies).toEqual([
      { companyKey: "123456", companyName: "테스트제약", status: "active" },
    ]);
  });

  it("creates company with company_name only on POST", async () => {
    const module = await import("@/lib/server/console/company-context");
    vi.mocked(module.createCompany).mockResolvedValue({
      companyKey: "482193",
      companyName: "신규제약",
      status: "active",
    });

    const route = await import("./route");
    const request = new Request("http://localhost/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: "신규제약" }),
    });

    const response = await route.POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(module.createCompany).toHaveBeenCalledWith({
      companyName: "신규제약",
      status: undefined,
      notes: undefined,
    });
    expect(payload.company).toEqual({
      company_key: "482193",
      company_name: "신규제약",
      status: "active",
    });
  });
});
