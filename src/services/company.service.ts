import { api } from "../lib/api";
import type { CompanyItem } from "../lib/redux/api/types";

export interface ListApprovedCompaniesParams {
  approvalStatus?: string;
  limit?: number;
  [key: string]: unknown;
}

/** Get approved companies for selection */
export const listApprovedCompanies = (params: ListApprovedCompaniesParams = { approvalStatus: "APPROVED" }) =>
  api.get<{ message?: string; data: CompanyItem[] }>("/company/companies", {
    params: {
      approvalStatus: "APPROVED",
      ...params,
    },
  });
