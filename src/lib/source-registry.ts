export type SourceKey =
  | "crm_activity"
  | "crm_rep_master"
  | "crm_account_assignment"
  | "crm_rules"
  | "sales"
  | "target"
  | "prescription";

export type SourceDefinition = {
  sourceKey: SourceKey;
  label: string;
  folder: string;
  filenameBase: string;
  supportsMonthlyUpload: boolean;
};

export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    sourceKey: "crm_activity",
    label: "CRM Activity",
    folder: "crm",
    filenameBase: "crm_activity_raw",
    supportsMonthlyUpload: true
  },
  {
    sourceKey: "crm_rep_master",
    label: "CRM Rep Master",
    folder: "crm",
    filenameBase: "crm_rep_master",
    supportsMonthlyUpload: false
  },
  {
    sourceKey: "crm_account_assignment",
    label: "CRM Account Assignment",
    folder: "crm",
    filenameBase: "crm_account_assignment",
    supportsMonthlyUpload: false
  },
  {
    sourceKey: "crm_rules",
    label: "CRM Rules",
    folder: "crm",
    filenameBase: "crm_rules",
    supportsMonthlyUpload: false
  },
  {
    sourceKey: "sales",
    label: "Sales",
    folder: "sales",
    filenameBase: "sales_raw",
    supportsMonthlyUpload: true
  },
  {
    sourceKey: "target",
    label: "Target",
    folder: "sales",
    filenameBase: "target_raw",
    supportsMonthlyUpload: true
  },
  {
    sourceKey: "prescription",
    label: "Prescription",
    folder: "prescription",
    filenameBase: "prescription_raw",
    supportsMonthlyUpload: true
  }
];

export function getSourceDefinition(sourceKey: string): SourceDefinition | null {
  return SOURCE_DEFINITIONS.find((item) => item.sourceKey === sourceKey) ?? null;
}

export function isSourceKey(value: string): value is SourceKey {
  return getSourceDefinition(value) !== null;
}
