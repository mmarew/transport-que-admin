import appAPIs from "@/utils/constant";
import type { PaginatedResponse, QueueOrgListItem } from "@/types/queue";
import { api } from "./base";
import type {
  AddQueueOrgMemberArgs,
  AddQueueOrgMemberResponse,
  ApproveQueueOrgArgs,
  ApproveQueueOrgResponse,
  CreateQueueOrgArgs,
  CreateQueueOrgResponse,
  DeleteQueueOrgResponse,
  QueueOrgListArgs,
  QueueOrgListResponse,
  QueueOrgMemberListResponse,
  QueueOrgUniqueIdResponse,
  UpdateQueueOrgArgs,
} from "./types";

export const {
  useListQueueOrganizationsQuery,
  useGetQueueOrganizationQuery,
  useUpdateQueueOrganizationMutation,
  useApproveQueueOrganizationMutation,
  useDeleteQueueOrganizationMutation,
  useCreateQueueOrganizationMutation,
  useListQueueOrgMembersQuery,
  useAddQueueOrgMemberMutation,
} = api.injectEndpoints({
  endpoints: (builder) => ({
    listQueueOrganizations: builder.query<PaginatedResponse<QueueOrgListItem>, QueueOrgListArgs>({
      query: (params) => {
        const queryParams = { limit: 100, ...(params || {}) };
        return { url: appAPIs.listQueueOrganizationsAPI, params: queryParams };
      },
      providesTags: ["QueueOrganizations"],
    }),

    getQueueOrganization: builder.query<QueueOrgListResponse, string>({
      query: (id) => appAPIs.getQueueOrganizationAPI.replace(":id", id),
      providesTags: (_, __, id) => [{ type: "QueueOrganizations", id }],
    }),

    updateQueueOrganization: builder.mutation<QueueOrgUniqueIdResponse, UpdateQueueOrgArgs>({
      query: ({ id, body }) => ({
        url: appAPIs.updateQueueOrganizationAPI.replace(":id", id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => ["QueueOrganizations", { type: "QueueOrganizations", id }],
    }),

    approveQueueOrganization: builder.mutation<ApproveQueueOrgResponse, ApproveQueueOrgArgs>({
      query: ({ id, body }) => ({
        url: appAPIs.approveQueueOrganizationAPI.replace(":id", id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_, __, { id }) => ["QueueOrganizations", { type: "QueueOrganizations", id }],
    }),

    deleteQueueOrganization: builder.mutation<DeleteQueueOrgResponse, string>({
      query: (id) => ({
        url: appAPIs.getQueueOrganizationAPI.replace(":id", id),
        method: "DELETE",
      }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    createQueueOrganization: builder.mutation<CreateQueueOrgResponse, CreateQueueOrgArgs>({
      query: (body) => ({ url: appAPIs.createQueueOrganizationAPI, method: "POST", body }),
      invalidatesTags: ["QueueOrganizations"],
    }),

    listQueueOrgMembers: builder.query<QueueOrgMemberListResponse, string>({
      query: (id) => appAPIs.listQueueOrgMembersAPI.replace(":id", id),
      providesTags: (_, __, id) => [{ type: "QueueOrgMembers", id }],
    }),

    addQueueOrgMember: builder.mutation<AddQueueOrgMemberResponse, AddQueueOrgMemberArgs>({
      query: ({ id, userUniqueId, ...body }) => ({
        url: appAPIs.addQueueOrgMemberAPI.replace(":id", id).replace(":userUniqueId", userUniqueId),
        method: "POST",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }, "QueueOrganizations"],
    }),
  }),
});