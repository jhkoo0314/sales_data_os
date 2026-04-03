export type CompanyOverview = {
  companyKey: string;
  companyName: string;
  companyStatus: string;
  intakeStatus: string | null;
  readyForAdapter: boolean;
  uploadedSourceCount: number;
  totalSourceCount: number;
  latestRunKey: string | null;
  latestRunStatus: string | null;
  reportCount: number;
  artifactCount: number;
  nextAction: string;
};
