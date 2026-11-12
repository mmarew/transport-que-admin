import appAPIs from "@/utils/constant";
import { api } from "./base";
import type { ListCompaniesArgs, ListCompaniesResponse, CompanyItem } from "./types";

export const {
  useListCompaniesQuery,
  useLazyListCompaniesQuery,
} = api.injectEndpoints({
  endpoints: (builder) => ({
    listCompanies: builder.query<ListCompaniesResponse, ListCompaniesArgs | void>({
      query: (args) => ({
        url: appAPIs.companiesAPI,
        params: {
          approvalStatus: args?.approvalStatus ?? "APPROVED",
          ...(args?.limit ? { limit: args.limit } : {}),
        },
      }),
      transformResponse: (raw: any): ListCompaniesResponse => {
        const rawList =
          (Array.isArray(raw) ? raw : null) ||
          (Array.isArray(raw?.data) ? raw.data : null) ||
          (Array.isArray(raw?.data?.companies) ? raw.data.companies : null) ||
          (Array.isArray(raw?.data?.rows) ? raw.data.rows : null) ||
          (Array.isArray(raw?.companies) ? raw.companies : null) ||
          (Array.isArray(raw?.rows) ? raw.rows : null) ||
          (Array.isArray(raw?.items) ? raw.items : null) ||
          [];

        const normalized: CompanyItem[] = rawList.map((item: any) => ({
          companyUniqueId: String(
            item.companyUniqueId || item.uniqueId || item.id || item.targetCompanyUniqueId || ""
          ),
          companyName: String(
            item.companyName || item.name || item.legalName || item.companyLegalName || "Unnamed Company"
          ),
          approvalStatus: item.approvalStatus,
          phoneNumber: item.phoneNumber || item.companyPhone || item.phone || null,
        }));

        return {
          message: raw?.message || "Companies retrieved successfully",
          data: normalized,
        };
      },
      providesTags: ["Companies"],
    }),
  }),
});
