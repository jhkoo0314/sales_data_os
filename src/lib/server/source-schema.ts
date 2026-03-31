import type { SourceKey } from "@/lib/source-registry";

export type SourceModuleKey = "crm" | "sandbox" | "prescription";

export const REQUIRED_COLUMNS: Record<SourceKey, string[]> = {
  crm_activity: ["activity_date", "rep", "account", "activity_type"],
  crm_rep_master: ["rep", "organization"],
  crm_account_assignment: ["account", "rep"],
  crm_rules: [],
  sales: ["account", "product", "amount", "period"],
  target: ["period", "target_value"],
  prescription: ["ship_date", "pharmacy", "product", "quantity"]
};

export const COLUMN_ALIASES: Record<string, string[]> = {
  activity_date: ["activity_date", "visit_date", "방문일", "활동일", "실행일", "date"],
  rep: ["rep", "담당자명", "사원명", "영업사원명", "담당자", "rep_name"],
  account: ["account", "병원코드", "병원명", "거래처명", "account_id", "account_name", "거래처코드"],
  activity_type: ["activity_type", "활동유형", "액션유형", "call_type"],
  organization: ["organization", "조직", "소속"],
  product: ["product", "product_id", "product_name", "품목명", "제품명", "brand", "sku"],
  amount: ["amount", "매출", "매출액", "실적", "revenue"],
  period: ["period", "yyyymm", "sales_month", "month", "매출월", "목표월", "기준년월", "월"],
  target_value: ["target_value", "목표", "목표값", "target"],
  ship_date: ["ship_date", "출고일", "처방일", "date"],
  pharmacy: ["pharmacy", "약국", "pharmacy_name"],
  quantity: ["quantity", "수량", "qty"]
};

export const SOURCE_TO_MODULE: Record<SourceKey, SourceModuleKey> = {
  crm_activity: "crm",
  crm_rep_master: "crm",
  crm_account_assignment: "crm",
  crm_rules: "crm",
  sales: "sandbox",
  target: "sandbox",
  prescription: "prescription"
};

export const STANDARDIZED_FILENAMES: Record<SourceKey, string> = {
  crm_activity: "standardized_crm_activity.json",
  crm_rep_master: "standardized_crm_rep_master.json",
  crm_account_assignment: "standardized_crm_account_assignment.json",
  crm_rules: "standardized_crm_rules.json",
  sales: "standardized_sales_records.json",
  target: "standardized_target_records.json",
  prescription: "standardized_prescription_records.json"
};

export const PREFERRED_SHEET_NAMES: Record<SourceKey, string[]> = {
  crm_activity: ["crm_activity", "activity", "활동", "영업활동", "sheet1"],
  crm_rep_master: ["crm_rep_master", "rep_master", "담당자", "사원", "sheet1"],
  crm_account_assignment: ["crm_account_assignment", "assignment", "배정", "거래처배정", "sheet1"],
  crm_rules: ["crm_rules", "rules", "rule", "규칙", "sheet1"],
  sales: ["sales", "매출", "실적", "sales_raw", "sheet1"],
  target: ["target", "목표", "plan", "target_raw", "sheet1"],
  prescription: ["prescription", "처방", "출고", "ship", "sheet1"]
};
