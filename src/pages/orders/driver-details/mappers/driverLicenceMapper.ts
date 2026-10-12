import type { DriverDetailsModel, ExtraDriverContext } from "../driverDetailsMapper";
import { extractDriverAttachedDocuments } from "./documentExtractor";

/**
 * Resolves driving licence specifications, authority, and verification status.
 */
export function resolveLicenceSpecs(
  candidateDriverObjs: Array<Record<string, any>>,
  isDriverAssigned: boolean,
  extraContext?: ExtraDriverContext,
  rawDriverReq?: any,
): DriverDetailsModel["licence"] {
  // Extract attached documents from all sources
  const allDocSources = [
    extraContext?.accountStatusData,
    extraContext?.driverAccountStatus,
    (extraContext?.accountStatusData as any)?.data,
    rawDriverReq,
    rawDriverReq?.rawDriver,
    rawDriverReq?.accountStatus,
    ...candidateDriverObjs,
  ];
  const attachedDocs = extractDriverAttachedDocuments(allDocSources);

  // Find Driver's License document
  const licDoc = attachedDocs.find((d: any) => {
    const name = String(d.documentTypeName || d.uploadedDocumentName || d.documentTypeDescription || "").toLowerCase();
    return (
      (name.includes("license") || name.includes("licence") || name.includes("driver")) &&
      !name.includes("vehicle") &&
      !name.includes("librea") &&
      !name.includes("registration") &&
      !name.includes("insurance")
    );
  });

  // Licence Number
  let resolvedLicenceNum: string | null = null;
  if (licDoc) {
    const fNum = licDoc.attachedDocumentFileNumber || licDoc.uploadedDocumentFileNumber || licDoc.fileNumber;
    if (fNum && typeof fNum === "string" && fNum.trim()) {
      resolvedLicenceNum = fNum.trim();
    }
  }

  if (!resolvedLicenceNum) {
    for (const d of candidateDriverObjs) {
      const num = d.drivingLicense || d.driverLicense || d.licenseNumber || d.drivingLicenceNumber || d.licenceNumber;
      if (num && typeof num === "string" && num.trim()) {
        resolvedLicenceNum = num.trim();
        break;
      }
    }
  }
  const licenceNumber = resolvedLicenceNum
    ? String(resolvedLicenceNum).trim()
    : isDriverAssigned
    ? "Not recorded"
    : "Pending assignment";

  // Licence Class
  let resolvedClass: string | null = null;
  for (const d of candidateDriverObjs) {
    const c = d.licenseClass || d.licenceClass || d.licenseGrade || d.grade || d.category;
    if (c && typeof c === "string" && c.trim()) {
      resolvedClass = c.trim();
      break;
    }
  }
  if (!resolvedClass && licDoc?.documentTypeDescription) {
    const desc = licDoc.documentTypeDescription;
    const gradeMatch = desc.match(/grade\s*[0-9a-z]+/i);
    if (gradeMatch) {
      resolvedClass = gradeMatch[0];
    }
  }
  const licenceClass = resolvedClass
    ? resolvedClass.trim()
    : isDriverAssigned
    ? "Not recorded"
    : "—";

  // Issued By
  let resolvedIssuedBy: string | null = null;
  for (const d of candidateDriverObjs) {
    const iss = d.issuedBy || d.licenseIssuedBy || d.issueAuthority || d.authority;
    if (iss && typeof iss === "string" && iss.trim()) {
      resolvedIssuedBy = iss.trim();
      break;
    }
  }
  const issuedBy = resolvedIssuedBy
    ? resolvedIssuedBy.trim()
    : isDriverAssigned
    ? "Not recorded"
    : "—";

  // Valid Until
  let resolvedValidUntil: string | null = null;
  if (licDoc) {
    const exp = licDoc.documentExpirationDate || licDoc.uploadedDocumentExpirationDate || licDoc.expirationDate;
    if (exp && typeof exp === "string" && exp.trim()) {
      resolvedValidUntil = exp.trim();
    }
  }

  if (!resolvedValidUntil) {
    for (const d of candidateDriverObjs) {
      const val = d.licenseValidUntil || d.licenseExpiryDate || d.validUntil || d.expiryDate;
      if (val && typeof val === "string" && val.trim()) {
        resolvedValidUntil = val.trim();
        break;
      }
    }
  }

  let validUntil = isDriverAssigned ? "Not recorded" : "—";
  if (resolvedValidUntil) {
    try {
      const d = new Date(resolvedValidUntil);
      if (!isNaN(d.getTime())) {
        validUntil = d.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "Africa/Addis_Ababa",
        });
      } else {
        validUntil = resolvedValidUntil;
      }
    } catch {
      validUntil = resolvedValidUntil;
    }
  }

  // Experience Years
  let resolvedExp: string | null = null;
  for (const d of candidateDriverObjs) {
    const exp = d.drivingExperience || d.experienceYears || d.experience || d.yearsOfExperience;
    if (exp != null && String(exp).trim() !== "") {
      resolvedExp = typeof exp === "number" ? `${exp} years` : String(exp).trim();
      break;
    }
  }
  const experienceYears = resolvedExp
    ? resolvedExp
    : isDriverAssigned
    ? "Not recorded"
    : "—";

  // Emergency Contact
  let resolvedEmergency: string | null = null;
  for (const d of candidateDriverObjs) {
    const em = d.emergencyContact || d.emergencyPhone || d.emergencyContactPhone;
    if (em && typeof em === "string" && em.trim()) {
      resolvedEmergency = em.trim();
      break;
    }
  }
  const emergencyContact = resolvedEmergency || (isDriverAssigned ? "Not recorded" : "—");

  const hasAcceptedDocs = (extraContext?.accountStatusData?.attachedDocumentsByStatus?.ACCEPTED?.length ?? 0) > 0;
  const isAccountActive =
    extraContext?.accountStatusData?.status === 1 ||
    extraContext?.accountStatusData?.userData?.statusName === "active" ||
    hasAcceptedDocs;

  const isVerified = Boolean(isDriverAssigned || isAccountActive);

  return {
    number: licenceNumber,
    licenceClass,
    issuedBy,
    validUntil,
    experienceYears,
    emergencyContact,
    isVerified,
  };
}
