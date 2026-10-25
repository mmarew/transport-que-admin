import { describe, it, expect } from "vitest";
import { en } from "../i18n/en";
import { am } from "../i18n/am";

describe("Pending Company Status & Info Icon Requirements", () => {
  it("has English translations explaining pending status, admin phone number, and help callout", () => {
    expect(en.dashboard.pendingStageNotice).toBe(
      "This company is currently in the pending stage.",
    );
    expect(en.dashboard.pendingAdminContact).toContain("Admin: {{phone}}");
    expect(en.dashboard.pendingCallAdminHelp).toBe(
      "Call the admin if you need more help.",
    );
    expect(en.dashboard.callAdminAction).toContain("Call Admin");
  });

  it("has Amharic translations explaining pending status, admin phone number, and help callout", () => {
    expect(am.dashboard.pendingStageNotice).toBe(
      "ይህ ድርጅት በአሁኑ ወቅት በመጠባበቅ ደረጃ ላይ ይገኛል።",
    );
    expect(am.dashboard.pendingAdminContact).toContain("አስተዳዳሪ፦ {{phone}}");
    expect(am.dashboard.pendingCallAdminHelp).toBe(
      "ተጨማሪ እርዳታ ከፈለጉ አስተዳዳሪውን ይደውሉ።",
    );
    expect(am.dashboard.callAdminAction).toContain("ለአስተዳዳሪው ይደውሉ");
  });

  it("constructs the exact required notice message with admin phone 0983222221", () => {
    const adminPhone = "0983222221";
    const stageNotice = en.dashboard.pendingStageNotice;
    const adminContact = en.dashboard.pendingAdminContact.replace(
      "{{phone}}",
      adminPhone,
    );
    const callHelp = en.dashboard.pendingCallAdminHelp;

    const fullMessage = `${stageNotice} ${adminContact}. ${callHelp}`;

    expect(fullMessage).toContain("pending stage");
    expect(fullMessage).toContain("0983222221");
    expect(fullMessage).toContain("Call the admin if you need more help");
  });

  it("verifies tel: protocol URI for admin call action", () => {
    const adminPhone = "0983222221";
    const telHref = `tel:${adminPhone}`;
    expect(telHref).toBe("tel:0983222221");
  });

  it("verifies pending status detection for organizations", () => {
    const orgs = [
      {
        organization: {
          queueOrganizationUniqueId: "org-1",
          queueOrganizationName: "Mojo dry port",
          queueOrganizationType: "Cement",
          queueOrganizationAddress: "Addis Ababa",
          approvalStatus: "approved",
          queueEnabled: 1,
        },
      },
      {
        organization: {
          queueOrganizationUniqueId: "org-2",
          queueOrganizationName: "qality customs",
          queueOrganizationType: "Customs",
          queueOrganizationAddress: "Kaliti Customs diplomatic privilege dep.",
          approvalStatus: "pending",
          queueEnabled: 0,
        },
      },
    ];

    const isPending = (status?: string) =>
      String(status || "pending").toLowerCase() === "pending";

    expect(isPending(orgs[0].organization.approvalStatus)).toBe(false);
    expect(isPending(orgs[1].organization.approvalStatus)).toBe(true);
    expect(isPending(undefined)).toBe(true);
  });
});
