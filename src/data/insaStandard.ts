// Data extracted from INSAREQUIREMENT.md — INSA Secure Website Management Standard V1.0 (2014 EC).
// The standard text is kept in English (official document language); UI labels are translated via i18n.

export type RequirementLevel = "must" | "should" | "may";

export interface InsaRequirement {
  id: string;
  level: RequirementLevel;
  text: string;
  subItems?: string[];
}

export interface InsaFocusArea {
  id: string;
  section: string;
  titleKey: string;
  objective: string;
  requirements: InsaRequirement[];
}

export interface InsaVulnerability {
  no: number;
  vulnerability: string;
  threats: string[];
}

export interface InsaTestItem {
  no: number;
  text: string;
}

export interface InsaTestGroup {
  id: string;
  title: string;
  items: InsaTestItem[];
}

export const insaStandardMeta = {
  name: "Secure Website Management Standard",
  version: "Version 1.0",
  issuedBy: "Information Network Security Agency (INSA)",
  year: "2014 EC",
};

export const insaPrinciples: { titleKey: string; text: string }[] = [
  {
    titleKey: "security.principles.mission",
    text: "Websites should reflect organizations' business requirement and they should be developed and managed in a way that helps organizations achieve their mission.",
  },
  {
    titleKey: "security.principles.simplicity",
    text: "Websites should be simple for users and administrators/managers.",
  },
  {
    titleKey: "security.principles.accessibility",
    text: "Websites should be accessible at any time and place using any device.",
  },
  {
    titleKey: "security.principles.risk",
    text: "The security controls implemented on websites should be based on thorough risk assessment results.",
  },
  {
    titleKey: "security.principles.integrate",
    text: "Security features should be integrated at each component of the website while designing, implementing, hosting, operating, and managing it.",
  },
];

export const insaFocusAreas: InsaFocusArea[] = [
  {
    id: "requirement-gathering",
    section: "2.1",
    titleKey: "security.focusAreas.requirementGathering",
    objective:
      "The objective of the requirement gathering and analysis is to organize, analyze, and reflect the intents of the organization's website while developing and managing.",
    requirements: [
      {
        id: "RGA-A",
        level: "should",
        text: "The business requirement gathering should comprise the most fundamental issues that address the organization's missions, business objectives, and acceptable risk criteria.",
      },
      {
        id: "RGA-B",
        level: "should",
        text: "The gathered organizational business requirement should be relevant and provide reliable information in alignment with the requirement A.",
      },
      {
        id: "RGA-C",
        level: "should",
        text: "The requirement should include security objectives and needs of all relevant stakeholders.",
      },
      {
        id: "RGA-D",
        level: "should",
        text: "The requirements should provide details of how the website should behave securely and specify what is needed to be done during design, implementation, hosting, operation, and management.",
      },
      {
        id: "RGA-E",
        level: "should",
        text: "The requirements gathering document should address post implementation security needs of stakeholders such as about hosting, operation, and management of the website.",
      },
      {
        id: "RGA-F",
        level: "should",
        text: "The requirement analysis should be unambiguous, and recorded as organizational asset.",
      },
      {
        id: "RGA-G",
        level: "must",
        text: "Contracts with developers must consider the protection of the intellectual property of source code to protect organizational interests.",
      },
      {
        id: "RGA-H",
        level: "must",
        text: "Security requirements must be approved by top management of the organization or relevant business owner.",
      },
    ],
  },
  {
    id: "design",
    section: "2.2",
    titleKey: "security.focusAreas.design",
    objective:
      "The objective of this focus area is to define considerable security requirements in website design.",
    requirements: [
      {
        id: "DES-A",
        level: "should",
        text: "The Website should be designed based on secure software development and management standard V.1 requirements.",
      },
      {
        id: "DES-B",
        level: "should",
        text: "The Website design document should be reviewed and approved by the respective responsible body of the organizations.",
      },
    ],
  },
  {
    id: "implementation",
    section: "2.3",
    titleKey: "security.focusAreas.implementation",
    objective:
      "The objective of this focus area is to provide security requirements for coding and testing of the website.",
    requirements: [
      {
        id: "IMP-A",
        level: "should",
        text: "The Website should be implemented based on secure software development and management standard V.1 requirements.",
      },
      {
        id: "IMP-B",
        level: "should",
        text: "Website developers should sufficiently be aware of security requirements of the organization.",
      },
      {
        id: "IMP-C",
        level: "must",
        text: "Organizations must ensure that their website is awarded accreditation before hosted based on Critical Mass Cyber Security Requirement Standard Version 1.0.",
      },
      {
        id: "IMP-D",
        level: "must",
        text: "The website must be audited before hosted based on the auditing Process defined in the Critical Mass Cyber Security Requirement Standard.",
      },
      {
        id: "IMP-E",
        level: "must",
        text: "All documentation must adequately be protected from unauthorized access.",
      },
    ],
  },
  {
    id: "hosting",
    section: "2.4",
    titleKey: "security.focusAreas.hosting",
    objective:
      "The Website hosting security requirement intends to proactively manage security issues related to the hosting services.",
    requirements: [
      {
        id: "HOS-A",
        level: "should",
        text: "The organization should prepare a comprehensive hosting security requirement document that comprises technical and non-technical issues before hosting its website.",
      },
      {
        id: "HOS-B",
        level: "should",
        text: "Website hosting security requirements document should examine the hosting service provider's security capability in terms of technical parameters including but not limited to:",
        subItems: [
          "Staff capability of hosting service provider",
          "Network infrastructure security",
          "System infrastructure security including the server operating system, hosting platform",
          "Implemented Communication encryption tools",
          "Business continuity plan",
          "Disaster recovery capability",
          "Physical security",
        ],
      },
      {
        id: "HOS-C",
        level: "should",
        text: "Website hosting security requirements document should examine hosting service provider's security capability in terms of non-technical parameters including but not limited to:",
        subItems: [
          "The most recent third-party security audit reports on the hosting service provider",
          "Business processes of the hosting service provider",
        ],
      },
      {
        id: "HOS-D",
        level: "should",
        text: "Government websites should be hosted on organization premises or on hosting entity infrastructure deployed in Ethiopia.",
      },
      {
        id: "HOS-E",
        level: "should",
        text: "Separate comprehensive security agreements should be signed between the organization and the hosting service provider which comprise the following provisions:",
        subItems: [
          "Roles, Responsibility, and accountability of the contracting parties",
          "Breach handling procedures and responsibilities",
          "Exceptional events",
          "Expected service levels",
          "Communication methods",
          "Not complying with National Standards, Regulations, and other related legal mandates",
          "Service contacts",
          "Data limits",
          "Bandwidth limits",
          "Downtime limits",
          "Domain namespaces scalability and changes",
          "Ability to unlink for any violations of law or regulation, breach or violation of any contract provisions",
        ],
      },
    ],
  },
  {
    id: "operation-management",
    section: "2.5",
    titleKey: "security.focusAreas.operationManagement",
    objective:
      "The Objective of this focus area is to set requirements on how to manage all security anomalies faced during operations.",
    requirements: [
      {
        id: "OPM-A",
        level: "should",
        text: "Organizations should have clear policy statements, to manage their organizational websites. Organizational Website policies should address at least the following points:",
        subItems: [
          "Administrative Responsibilities",
          "Emergency communications",
          "Contents management",
        ],
      },
      {
        id: "OPM-B",
        level: "should",
        text: "Organizations Website management and operation activities should be conducted based on documented procedures.",
      },
      {
        id: "OPM-C",
        level: "should",
        text: "Website access rights provisions should be granted and revoked formally via documented procedures.",
      },
      {
        id: "OPM-D",
        level: "should",
        text: "Website access privileges should be categorized based on business requirements and the website policy of the organization.",
      },
      {
        id: "OPM-E",
        level: "should",
        text: "Organizational Access credentials should be updated in a fixed time frame and whenever there is change in structure or strategic mission.",
      },
      {
        id: "OPM-F",
        level: "should",
        text: "Organizations should conduct security vulnerability and risk assessments on their website quarterly.",
      },
      {
        id: "OPM-G",
        level: "should",
        text: "Additional security testing should be undertaken as deemed necessary by risk assessment reports.",
      },
      {
        id: "OPM-H",
        level: "should",
        text: "Periodic testing and auditing should be performed to ensure the on-going effectiveness of website security controls as new threats emerge.",
      },
      {
        id: "OPM-I",
        level: "must",
        text: "Website changes, including updates and patches, must be reviewed and tested to ensure that there is no adverse impact on the operation. This includes:",
        subItems: [
          "Formal change control procedures must be established and documented, and evidence retained that the procedure is implemented and complied with",
          "Changes must be approved by the cyber security department",
        ],
      },
      {
        id: "OPM-J",
        level: "must",
        text: "When significant changes or enhancements are made, in advance operational risk assessment must be performed to consider the security implications of such changes.",
      },
      {
        id: "OPM-K",
        level: "should",
        text: "Website monitoring tools should be implemented to detect breaches or misuse of web applications.",
      },
      {
        id: "OPM-L",
        level: "should",
        text: "The organization should have proper patch and configuration management plans for its website.",
      },
      {
        id: "OPM-M",
        level: "must",
        text: "The patch and configuration management process must be tested on separate environment before implemented on the functional site.",
      },
      {
        id: "OPM-N",
        level: "should",
        text: "The organizations should continuously ensure communication encryption certificate updates of its website.",
      },
      {
        id: "OPM-O",
        level: "should",
        text: "The organization should follow and monitor periodic security updates and changes of the hosting service provider.",
      },
    ],
  },
];

// Annex A — Common vulnerabilities and threats of the website
export const insaVulnerabilities: InsaVulnerability[] = [
  {
    no: 1,
    vulnerability: "SQL Injection",
    threats: [
      "Bypass login authentication",
      "Disclosure of sensitive data stored in the database",
      "System shutdown",
    ],
  },
  {
    no: 2,
    vulnerability: "Unchecked Path Parameter / Directory Traversal",
    threats: [
      "Disclosure of sensitive information",
      "Falsification and deletion of configuration files, data files and source codes",
    ],
  },
  {
    no: 3,
    vulnerability: "Improper Session Management",
    threats: ["Unauthorized access to personal information", "Webmail"],
  },
  {
    no: 4,
    vulnerability: "Cross-Site Scripting",
    threats: [
      "Confusion caused by false information",
      "Disclosure of sensitive information through phishing attacks",
      "If the session ID is stored in the stolen cookie, it could lead to spoofing",
      "If personal information is stored in the stolen cookie, the sensitive data would be disclosed",
    ],
  },
  {
    no: 5,
    vulnerability: "CSRF (Cross-Site Request Forgery)",
    threats: [
      "Access the services normally available only for the users who have properly logged in",
    ],
  },
  {
    no: 6,
    vulnerability: "HTTP Header Injection",
    threats: [
      "When an HTTP Set-Cookie header is inserted, an arbitrary cookie is created and stored in the user's browser",
    ],
  },
  {
    no: 7,
    vulnerability: "Mail Header Injection",
    threats: ["Used as a launching pad for the spam distribution"],
  },
  {
    no: 8,
    vulnerability: "Lack of Authentication and Authorization",
    threats: ["Disclosure of sensitive information"],
  },
];

// Annex B — Minimum security testing of the website
export const insaTestGroups: InsaTestGroup[] = [
  {
    id: "information-disclosure",
    title: "Information Disclosure",
    items: [
      { no: 1, text: "Test for extraneous files in the document root" },
      { no: 2, text: "Test for extraneous directory listings" },
      { no: 3, text: "Test for accessible debug functionality" },
      { no: 4, text: "Test for sensitive information in log and error messages" },
      { no: 5, text: "Test for sensitive information in robots.txt" },
      { no: 6, text: "Test for sensitive information in source code" },
      { no: 7, text: "Test for disclosure of internal addresses" },
    ],
  },
  {
    id: "privacy-confidentiality",
    title: "Privacy and Confidentiality",
    items: [
      { no: 8, text: "Test for sensitive information stored in URLs" },
      { no: 9, text: "Test for unencrypted sensitive information stored at the client-side" },
      { no: 10, text: "Test for sensitive information stored in (externally) archived pages" },
      { no: 11, text: "Test for content included from untrusted sources" },
      { no: 12, text: "Test for caching of pages with sensitive information" },
      { no: 13, text: "Test for insecure transmission of sensitive information" },
      { no: 14, text: "Test for non-SSL/TLS pages on sites processing sensitive information" },
      { no: 15, text: "Test for SSL/TLS pages served with mixed content" },
      { no: 16, text: "Test for missing HSTS header on full SSL sites" },
      { no: 17, text: "Test for known vulnerabilities in SSL/TLS" },
      { no: 18, text: "Test for weak, untrusted or expired SSL certificates" },
      { no: 19, text: "Test for the usage of unproven cryptographic primitives" },
      { no: 20, text: "Test for the incorrect usage of cryptographic primitives" },
    ],
  },
  {
    id: "state-management",
    title: "State Management",
    items: [
      { no: 21, text: "Test for client-side state management" },
      { no: 22, text: "Test for invalid state transitions" },
    ],
  },
  {
    id: "auth-process",
    title: "Authentication and Authorization Process",
    items: [
      { no: 23, text: "Test for missing authentication or authorization" },
      { no: 24, text: "Test for client-side authentication" },
      { no: 25, text: "Test for predictable and default credentials" },
      { no: 26, text: "Test for predictable authentication or authorization tokens" },
      { no: 27, text: "Test for authentication or authorization based on obscurity" },
      { no: 28, text: "Test for identifier-based authorization/Privilege escalation citation" },
      { no: 29, text: "Test for acceptance of weak passwords" },
      { no: 30, text: "Test for account recovery process" },
      { no: 31, text: 'Test any "remember me" function' },
      { no: 32, text: "Test for fail-open conditions" },
      { no: 33, text: "Test any impersonation function/re CAPTCHA" },
      { no: 34, text: "Test for plaintext retrieval of passwords" },
      { no: 35, text: "Test for username enumeration/Test username uniqueness" },
      { no: 36, text: "Check for unsafe distribution of credentials" },
      { no: 37, text: "Test for missing rate limiting on authentication functionality" },
      { no: 38, text: "Test for missing re-authentication when changing credentials" },
      { no: 39, text: "Test for missing logout functionality" },
      { no: 40, text: "Test any multi-stage mechanisms" },
    ],
  },
  {
    id: "user-input",
    title: "User Input Management",
    items: [
      { no: 41, text: "Test for SQL injection" },
      { no: 42, text: "Test for path traversal and filename injection" },
      { no: 43, text: "Test for cross-site scripting (Stored, DOM and reflected)" },
      { no: 44, text: "Test for system command injection" },
      { no: 45, text: "Test for XML injection" },
      { no: 46, text: "Test for XPath injection" },
      { no: 47, text: "Test for XSL(T) injection" },
      { no: 48, text: "Test for SMTP injection" },
      { no: 49, text: "Test for SSI injection" },
      { no: 50, text: "Test for HTTP header injection" },
      { no: 51, text: "Test for HTTP parameter injection" },
      { no: 52, text: "Test for native software flaws (buffer overflow, integer bugs, format strings)" },
      { no: 53, text: "Test for LDAP injection" },
      { no: 54, text: "Test for dynamic scripting injection" },
      { no: 55, text: "Test for regular expression injection" },
      { no: 56, text: "Test for data property/field injection" },
      { no: 57, text: "Test for protocol-specific injection" },
      { no: 58, text: "Test for expression language injection" },
      { no: 59, text: "Fuzz all request parameters" },
      { no: 60, text: "Test for arbitrary redirection" },
    ],
  },
  {
    id: "session-management",
    title: "Session Management",
    items: [
      { no: 61, text: "Test for cross-site request forgery (CSRF)" },
      { no: 62, text: "Test for predictable CSRF tokens" },
      { no: 63, text: "Test for missing session revocation on logout" },
      { no: 64, text: "Test for missing session regeneration on login" },
      { no: 65, text: "Test for missing session regeneration when changing credentials" },
      { no: 66, text: "Test for missing revocation of other sessions when changing credentials" },
      { no: 67, text: "Test for missing Secure flag on session cookies" },
      { no: 68, text: "Test for missing HttpOnly Flag on session cookies" },
      { no: 69, text: "Test for non-restrictive domain on session cookies" },
      { no: 70, text: "Test for non-restrictive or missing path on session cookies" },
      { no: 71, text: "Test for predictable session identifiers" },
      { no: 72, text: "Test for session identifier collisions" },
      { no: 73, text: "Test for session fixation" },
      { no: 74, text: "Test for insecure transmission of session identifiers" },
      { no: 75, text: "Test for external session hijacking" },
      { no: 76, text: "Test for missing periodic expiration of sessions" },
      { no: 77, text: "Check for disclosure of tokens in logs" },
    ],
  },
  {
    id: "file-upload",
    title: "File Upload",
    items: [
      { no: 78, text: "Test for storage of uploaded files in the document root" },
      { no: 79, text: "Test for execution or interpretation of uploaded files" },
      { no: 80, text: "Test for uploading outside of designated upload directory" },
      { no: 81, text: "Test for missing size restrictions on uploaded files" },
      { no: 82, text: "Test for missing type validation on uploaded files" },
    ],
  },
  {
    id: "additional-checks",
    title: "Additional Checks",
    items: [
      { no: 83, text: "Test for missing or non-specific content type definitions" },
      { no: 84, text: "Test for missing character set definitions" },
      { no: 85, text: "Test for missing anti content sniffing measures" },
      { no: 86, text: "Test for XML external entity expansion" },
      { no: 87, text: "Test for external DTD parsing" },
      { no: 88, text: "Test for extraneous or dangerous XML extensions" },
      { no: 89, text: "Test for recursive entity expansion" },
      { no: 90, text: "Test for missing security updates" },
      { no: 91, text: "Test for unsupported or end-of-life software versions" },
      { no: 92, text: "Test for HTTP TRACK and TRACE methods/dangerous Methods" },
      { no: 93, text: "Test for extraneous functionality" },
      { no: 94, text: "Test for default credentials" },
      { no: 95, text: "Test for Bugs in web server software" },
      { no: 96, text: "Test for missing anti-clickjacking measures" },
      { no: 97, text: "Test for open redirection" },
      { no: 98, text: "Test for insecure cross-domain access policy" },
      { no: 99, text: "Test for missing rate limiting on e-mail functionality" },
      { no: 100, text: "Test for missing rate limiting on resource intensive functionality" },
      { no: 101, text: "Test for inappropriate rate limiting resulting in a denial of service" },
      { no: 102, text: "Test for application- or setup-specific problems" },
    ],
  },
];

export const insaTotalTests = insaTestGroups.reduce(
  (sum, g) => sum + g.items.length,
  0,
);

export const insaTotalRequirements = insaFocusAreas.reduce(
  (sum, f) => sum + f.requirements.length,
  0,
);
