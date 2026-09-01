// This file contains all the API endpoints for the application.
// It is used to store all the API endpoints in one place.
//This is sigle source of truth for API

const appAPIs = {
    loginAPI: "/user/loginUser",
    verifyOtpAPI: "/user/verifyUserByOTP",
    registerUserAPI: "/user/createUser",
    listQueueOrganizationsAPI: "/queueOrganization",
    getQueueOrganizationAPI: "/queueOrganization/:id",
    updateQueueOrganizationAPI: "/queueOrganization/:id",
    approveQueueOrganizationAPI: "/queueOrganization/:id/approve",
    createQueueOrganizationAPI: "/queueOrganization",
    listQueueOrgMembersAPI: "/queueOrganization/:id/members",
    addQueueOrgMemberAPI: "/queueOrganization/:id/members/:userUniqueId",
    getQueueStatusAPI: "/queue/status",
    manualCheckinAPI: "/queue/manualCheckin",
    manualCheckoutAPI: "/queue/manualCheckout",
    listVehicleTypesAPI: "/admin/vehicleTypes",
    listQueueOrgRoutesAPI: "/queueOrganization/:id/routes",
    // Correct backend endpoint for creating shipper requests
    createOrderAPI: "/shipperRequest/createRequest",
    getShipperRequestsAPI: "/user/getShipperRequest4allOrSingleUser",
    getQueueStatsAPI: "/queue/statistics",
    getOrgDriversAPI: "/driver/listDriversByOrg",
    getUserProfileAPI: "/user/getProfile",
    dispatchQueueAPI: "/queue/dispatch",
    removeEntryAPI: "/queue/entry/:queueUniqueId",
    overrideEntryAPI: "/queue/entry/:queueUniqueId/override",
    vechicleDriverList: "/vehicleDriver/list",
    listVehicleDriversAPI: "/vehicleDriver/list",
    listDriverVehiclesAPI: "/vehicleDriver/org/:queueOrganizationUniqueId",
    listDriversPaginatedAPI: "/driver/listPaginated",
    listDriversForCheckinAPI: "/queue/driver/checkin",
    getDriverVehiclesAPI: "/driver/:driverUniqueId/vehicles",
    addVehicleToDriverAPI: "/vehicleDriver",
    deleteVehicleDriverAPI: "/vehicleDriver/:id",
}
export default appAPIs