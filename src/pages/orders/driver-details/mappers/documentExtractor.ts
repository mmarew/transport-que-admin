/**
 * Extracts attached and required document records from diverse backend payload shapes,
 * including Account Status (GET /api/account/status), driver requests, and queue objects.
 */
export function extractDriverAttachedDocuments(candidateSources: any[]): any[] {
  const docs: any[] = [];
  const seen = new Set<string>();

  for (const src of candidateSources) {
    if (!src || typeof src !== "object") continue;

    const addDocs = (list?: any[]) => {
      if (!Array.isArray(list)) return;
      for (const d of list) {
        if (!d || typeof d !== "object") continue;
        const key =
          d.attachedDocumentUniqueId ||
          d.attachedDocumentId ||
          d.documentTypeUniqueId ||
          `${d.documentTypeName || d.uploadedDocumentName}_${d.attachedDocumentFileNumber || d.documentExpirationDate}`;
        if (!seen.has(key)) {
          seen.add(key);
          docs.push(d);
        }
      }
    };

    // 1. Direct attachedDocumentsByStatus
    if (src.attachedDocumentsByStatus && typeof src.attachedDocumentsByStatus === "object") {
      addDocs(src.attachedDocumentsByStatus.ACCEPTED);
      addDocs(src.attachedDocumentsByStatus.PENDING);
      addDocs(src.attachedDocumentsByStatus.REJECTED);
    }

    // 2. Direct arrays
    addDocs(src.attachedDocuments);
    addDocs(src.requiredDocuments);
    addDocs(src.documents);

    // 3. Nested accountStatusData
    if (src.accountStatusData && typeof src.accountStatusData === "object") {
      addDocs(src.accountStatusData.attachedDocumentsByStatus?.ACCEPTED);
      addDocs(src.accountStatusData.attachedDocumentsByStatus?.PENDING);
      addDocs(src.accountStatusData.requiredDocuments);
      addDocs(src.accountStatusData.attachedDocuments);
    }

    // 4. Nested accountStatus / driverAccountStatus
    if (src.accountStatus && typeof src.accountStatus === "object") {
      addDocs(src.accountStatus.attachedDocumentsByStatus?.ACCEPTED);
      addDocs(src.accountStatus.attachedDocumentsByStatus?.PENDING);
      addDocs(src.accountStatus.requiredDocuments);
      addDocs(src.accountStatus.attachedDocuments);
    }
    if (src.driverAccountStatus && typeof src.driverAccountStatus === "object") {
      addDocs(src.driverAccountStatus.attachedDocumentsByStatus?.ACCEPTED);
      addDocs(src.driverAccountStatus.attachedDocumentsByStatus?.PENDING);
      addDocs(src.driverAccountStatus.requiredDocuments);
      addDocs(src.driverAccountStatus.attachedDocuments);
    }
  }

  return docs;
}
