// This file contains all the API endpoints for the application.
// It is used to store all the API endpoints in one place.
// This is single source of truth for API.
//
// MAINTENANCE RULE: a constant here must (a) point at a route that actually
// exists on the backend, and (b) have at least one consumer. Constants that
// satisfy neither previously sat in this file pointing at 404s, which is worse
// than absent — the file claims to be authoritative, so the next developer
// reaches for the path and gets a silent failure with no hint it was never
// valid. If you add a constant before building its UI, expect to justify it.
//
// Backend route truth lives in transportBackEndNative/Routes/EndPoints/*.js.

const appAPIs = {
    // ── Auth ──────────────────────────────────────────────────────────────
    // NOTE: login and OTP verification deliberately send no roleId — the
    // backend resolves the account's own role from UserRole so a role 12
    // dispatcher can sign in here (see src/services/auth.service.ts).
    loginAPI: "/user/loginUser",
    verifyOtpAPI: "/user/verifyUserByOTP",
    registerUserAPI: "/user/createUser",
    logoutAPI: "/user/logout",

    // ── Queue organizations ───────────────────────────────────────────────
    createQueueOrganizationAPI: "/queueOrganization",
    listQueueOrganizationsAPI: "/queueOrganization",
    getQueueOrganizationAPI: "/queueOrganization/:id",
    updateQueueOrganizationAPI: "/queueOrganization/:id",
    approveQueueOrganizationAPI: "/queueOrganization/:id/approve",
    // userUniqueId travels in the BODY, not the path.
    listQueueOrgMembersAPI: "/queueOrganization/:id/members",
    addQueueOrgMemberAPI: "/queueOrganization/:id/members",
    deactivateQueueOrgMemberAPI: "/queueOrganization/:id/members/:membershipId/deactivate",
    reactivateQueueOrgMemberAPI: "/queueOrganization/:id/members/:membershipId/reactivate",
    deleteQueueOrgMemberAPI: "/queueOrganization/:id/members/:membershipId",

    // ── Driver queue ──────────────────────────────────────────────────────
    getQueueStatusAPI: "/queue/status",
    manualCheckinAPI: "/queue/manualCheckin",
    dispatchQueueAPI: "/queue/dispatch",
    removeEntryAPI: "/queue/entry/:queueUniqueId",
    overrideEntryAPI: "/queue/entry/:queueUniqueId/override",
    getEntryHistoryAPI: "/queue/entry/:queueUniqueId/history",

    // Driver directory for manual check-in — queue org staff only.
    driverDirectoryAPI: "/queue/driverDirectory",

    // ── Bidding on behalf of a shipper ────────────────────────────────────
    approveBiddingAPI: "/queue/bidding/approve",
    getBidsForOrderAPI: "/queue/bidding/order/:shipperRequestUniqueId/bids",
    // Accept a driver's bid. Keyed on the bid's companyBidRequestUniqueId;
    // body is { bidStatus } (e.g. "selected").
    updateCompanyBidStatusAPI: "/company/bids/:companyBidRequestUniqueId/status",
    companyBidsAPI: "/company/bids",

    // ── Shipper requests / offers ─────────────────────────────────────────
    createOrderAPI: "/shipperRequest/createRequest",
    getShipperRequestsAPI: "/user/getShipperRequest4allOrSingleUser",
    getShipperRequestBatchAPI: "/shipperRequestBatch",
    acceptDriverOfferAPI: "/shipper/acceptDriverOffer",

    // ── Reference data ────────────────────────────────────────────────────
    listVehicleTypesAPI: "/admin/vehicleTypes",
}
export default appAPIs
