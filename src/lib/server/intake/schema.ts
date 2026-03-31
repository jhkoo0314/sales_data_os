import type { SourceKey } from "@/lib/shared/source-registry";

export type SourceModuleKey = "crm" | "sandbox" | "prescription";

export const REQUIRED_COLUMNS: Record<SourceKey, string[]> = {
  crm_activity: ["activity_date", "rep", "account", "activity_type"],
  account_master: ["account_id", "account_name", "branch_id", "branch_name", "rep_id", "rep_name"],
  crm_rep_master: ["rep_id", "rep_name", "branch_id", "branch_name"],
  crm_account_assignment: ["account_id", "account_name", "branch_id", "branch_name", "rep_id", "rep_name"],
  crm_rules: ["metric_code", "metric_name", "formula_expression", "metric_version"],
  sales: ["account", "product", "amount", "period"],
  target: ["period", "target_value"],
  prescription: ["ship_date", "pharmacy", "product", "quantity"]
};

export const COLUMN_ALIASES: Record<string, string[]> = {
  activity_date: ["activity_date", "visit_date", "방문일", "활동일", "실행일", "date"],
  rep: ["rep", "담당자명", "사원명", "영업사원명", "담당자", "rep_name"],
  rep_id: ["rep_id", "영업사원코드", "사원코드", "담당자코드", "mr_id", "rep_code", "담당자id"],
  rep_name: ["rep_name", "영업사원명", "담당자명", "사원명", "rep", "mr_name", "rep_nm", "담당자이름"],
  account: ["account", "병원코드", "병원명", "거래처명", "account_id", "account_name", "거래처코드", "방문기관", "hospital_id", "hospital_name"],
  account_id: ["account_id", "거래처코드", "병원코드", "account_code", "hospital_id"],
  account_name: ["account_name", "거래처명", "병원명", "거래처", "account", "방문기관", "hospital_name"],
  activity_type: ["activity_type", "활동유형", "액션유형", "call_type"],
  organization: ["organization", "조직", "소속"],
  branch_id: ["branch_id", "본부코드", "지점코드", "branch_code", "조직코드", "team_code"],
  branch_name: ["branch_name", "본부명", "지점명", "branch", "조직명", "team_name"],
  region_key: ["region_key", "광역시도", "시도", "지역"],
  sub_region_key: ["sub_region_key", "시군구", "구군", "세부지역"],
  account_capacity: ["account_capacity", "배정가능계정수", "담당가능계정수"],
  product: ["product", "product_id", "product_name", "품목명", "제품명", "brand", "sku", "브랜드명", "브랜드코드", "brand (브랜드)", "sku (sku)", "sku (SKU)"],
  amount: ["amount", "매출", "매출액", "실적", "revenue", "매출금액", "amount_ship", "공급가액", "출고금액"],
  period: ["period", "yyyymm", "sales_month", "month", "매출월", "목표월", "기준년월", "월"],
  target_value: ["target_value", "목표", "목표값", "target", "계획금액", "목표금액", "목표수량", "target_amount", "target_qty"],
  ship_date: ["ship_date", "출고일", "처방일", "date", "ship_date (출고일)", "ship_date출고일"],
  pharmacy: ["pharmacy", "약국", "약국명", "pharmacy_name", "pharmacy_name (약국명)", "pharmacy_account_id", "pharmacy_account_id (약국거래처ID)"],
  quantity: ["quantity", "수량", "qty", "qty (수량)", "출고수량"],
  metric_code: ["metric_code", "kpi_code", "지표코드", "rule_code", "metric_id", "kpi_id"],
  metric_name: ["metric_name", "metric_name_ko", "kpi_name", "지표명", "rule_name", "metric_nm"],
  formula_expression: ["formula_expression", "formula", "계산식", "산식", "formula_text", "rule_expression"],
  metric_version: ["metric_version", "version", "버전", "rule_version", "version_no"]
};

export const SOURCE_TO_MODULE: Record<SourceKey, SourceModuleKey> = {
  crm_activity: "crm",
  account_master: "crm",
  crm_rep_master: "crm",
  crm_account_assignment: "crm",
  crm_rules: "crm",
  sales: "sandbox",
  target: "sandbox",
  prescription: "prescription"
};

export const STANDARDIZED_FILENAMES: Record<SourceKey, string> = {
  crm_activity: "standardized_crm_activity.json",
  account_master: "standardized_account_master.json",
  crm_rep_master: "standardized_crm_rep_master.json",
  crm_account_assignment: "standardized_crm_account_assignment.json",
  crm_rules: "standardized_crm_rules.json",
  sales: "standardized_sales_records.json",
  target: "standardized_target_records.json",
  prescription: "standardized_prescription_records.json"
};

export const PREFERRED_SHEET_NAMES: Record<SourceKey, string[]> = {
  crm_activity: ["crm_activity", "activity", "활동", "영업활동", "sheet1"],
  account_master: ["account_master", "account", "거래처", "거래처마스터", "sheet1"],
  crm_rep_master: ["crm_rep_master", "rep_master", "담당자", "사원", "sheet1"],
  crm_account_assignment: ["crm_account_assignment", "assignment", "배정", "거래처배정", "sheet1"],
  crm_rules: ["crm_rules", "rules", "rule", "규칙", "sheet1"],
  sales: ["sales", "매출", "실적", "sales_raw", "sheet1"],
  target: ["target", "목표", "plan", "target_raw", "sheet1"],
  prescription: ["prescription", "처방", "출고", "ship", "sheet1"]
};
