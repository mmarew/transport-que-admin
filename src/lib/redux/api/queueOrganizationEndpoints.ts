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
  QueueOrgMemberLifecycleArgs,
  QueueOrgMemberLifecycleResponse,
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
  useDeactivateQueueOrgMemberMutation,
  useReactivateQueueOrgMemberMutation,
  useDeleteQueueOrgMemberMutation,
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
      // userUniqueId travels in the BODY, not the path. The backend route is
      // POST /queueOrganization/:queueOrganizationUniqueId/members with
      // userUniqueId required by Validations/QueueOrganization.schema.js.
      query: ({ id, ...body }) => ({
        url: appAPIs.addQueueOrgMemberAPI.replace(":id", id),
        method: "POST",
        body,
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }, "QueueOrganizations"],
    }),

    // ── Member lifecycle ────────────────────────────────────────────────
    // Membership IS the permission: VerifyToken.verifyIfUserIsQueueOrgAdmin
    // requires an active QueueOrganizationMembership row (roleId 11/12,
    // isActive = 1, not soft-deleted). Deactivating a member therefore revokes
    // their queue access on the very next request.
    deactivateQueueOrgMember: builder.mutation<
      QueueOrgMemberLifecycleResponse,
      QueueOrgMemberLifecycleArgs
    >({
      query: ({ id, membershipId }) => ({
        url: appAPIs.deactivateQueueOrgMemberAPI
          .replace(":id", id)
          .replace(":membershipId", membershipId),
        method: "PATCH",
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }, "QueueOrganizations"],
    }),

    reactivateQueueOrgMember: builder.mutation<
      QueueOrgMemberLifecycleResponse,
      QueueOrgMemberLifecycleArgs
    >({
      query: ({ id, membershipId }) => ({
        url: appAPIs.reactivateQueueOrgMemberAPI
          .replace(":id", id)
          .replace(":membershipId", membershipId),
        method: "PATCH",
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }, "QueueOrganizations"],
    }),

    deleteQueueOrgMember: builder.mutation<
      QueueOrgMemberLifecycleResponse,
      QueueOrgMemberLifecycleArgs
    >({
      query: ({ id, membershipId }) => ({
        url: appAPIs.deleteQueueOrgMemberAPI
          .replace(":id", id)
          .replace(":membershipId", membershipId),
        method: "DELETE",
      }),
      invalidatesTags: (_, __, { id }) => [{ type: "QueueOrgMembers", id }, "QueueOrganizations"],
    }),
  }),
});