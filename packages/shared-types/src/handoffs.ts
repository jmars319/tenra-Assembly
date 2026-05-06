export interface RegistryAssemblyDocumentRequest {
  schema: "tenra-registry.assembly-document-request.v1";
  exportId: string;
  exportedAt: string;
  sourceApp: "registry";
  organizationId: string;
  customerId: string;
  assignmentId?: string | undefined;
  documentType: string;
  title: string;
  contextMarkdown: string;
  desiredOutput: "letter" | "email" | "notice" | "agreement" | "statement";
}

export function parseRegistryAssemblyDocumentRequest(input: unknown): RegistryAssemblyDocumentRequest {
  if (!input || typeof input !== "object") {
    throw new Error("Registry document request must be an object.");
  }

  const candidate = input as Partial<RegistryAssemblyDocumentRequest>;
  const desiredOutput = candidate.desiredOutput;
  if (
    candidate.schema !== "tenra-registry.assembly-document-request.v1" ||
    candidate.sourceApp !== "registry" ||
    typeof candidate.exportedAt !== "string" ||
    typeof candidate.exportId !== "string" ||
    typeof candidate.organizationId !== "string" ||
    typeof candidate.customerId !== "string" ||
    typeof candidate.documentType !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.contextMarkdown !== "string" ||
    !isRegistryDocumentOutput(desiredOutput)
  ) {
    throw new Error("Registry document request is missing required handoff fields.");
  }

  return {
    schema: "tenra-registry.assembly-document-request.v1",
    exportId: candidate.exportId,
    exportedAt: candidate.exportedAt,
    sourceApp: "registry",
    organizationId: candidate.organizationId,
    customerId: candidate.customerId,
    assignmentId: candidate.assignmentId,
    documentType: candidate.documentType,
    title: candidate.title,
    contextMarkdown: candidate.contextMarkdown,
    desiredOutput
  };
}

export interface AssemblyProxyNoticeHandoff {
  schema: "tenra-assembly.proxy-notice-handoff.v1";
  exportedAt: string;
  sourceApp: "assembly";
  contentItemId: string;
  title: string;
  draftText: string;
  sourceRegistryExportId?: string | undefined;
  proxyShapeRequest: {
    clientApp: "assembly";
    surface: "internal-note";
    profileId: "profile:default";
    purpose: string;
    draftText: string;
    audience: string;
    sourceArtifact: {
      schema: string;
      artifactId?: string | undefined;
      exportedAt?: string | undefined;
    };
    hardConstraints: string[];
    traceId: string;
  };
}

export interface ScoutOpportunityHandoff {
  schema: "tenra-scout.opportunity-handoff.v1";
  exportedAt: string;
  sourceApp: "scout";
  runId: string;
  candidateId: string;
  businessName: string;
  primaryUrl: string;
  evidenceMarkdown: string;
  recommendedNextApps: Array<"assembly" | "proxy">;
  proxyShapeRequest: {
    clientApp: "scout";
    surface: "email" | "operator-brief" | "report";
    profileId: string;
    purpose: string;
    draftText: string;
    hardConstraints: string[];
    traceId: string;
  };
}

function isRegistryDocumentOutput(
  value: unknown
): value is RegistryAssemblyDocumentRequest["desiredOutput"] {
  return (
    typeof value === "string" &&
    ["letter", "email", "notice", "agreement", "statement"].includes(value)
  );
}

export function parseScoutOpportunityHandoff(input: unknown): ScoutOpportunityHandoff {
  if (!input || typeof input !== "object") {
    throw new Error("Scout opportunity handoff must be an object.");
  }

  const candidate = input as Partial<ScoutOpportunityHandoff>;
  const proxyShapeRequest = candidate.proxyShapeRequest;
  if (
    candidate.schema !== "tenra-scout.opportunity-handoff.v1" ||
    candidate.sourceApp !== "scout" ||
    typeof candidate.exportedAt !== "string" ||
    typeof candidate.runId !== "string" ||
    typeof candidate.candidateId !== "string" ||
    typeof candidate.businessName !== "string" ||
    typeof candidate.primaryUrl !== "string" ||
    typeof candidate.evidenceMarkdown !== "string" ||
    !Array.isArray(candidate.recommendedNextApps) ||
    !proxyShapeRequest ||
    proxyShapeRequest.clientApp !== "scout" ||
    typeof proxyShapeRequest.profileId !== "string" ||
    typeof proxyShapeRequest.purpose !== "string" ||
    typeof proxyShapeRequest.draftText !== "string" ||
    !Array.isArray(proxyShapeRequest.hardConstraints) ||
    typeof proxyShapeRequest.traceId !== "string"
  ) {
    throw new Error("Scout opportunity handoff is missing required fields.");
  }

  return {
    schema: "tenra-scout.opportunity-handoff.v1",
    exportedAt: candidate.exportedAt,
    sourceApp: "scout",
    runId: candidate.runId,
    candidateId: candidate.candidateId,
    businessName: candidate.businessName,
    primaryUrl: candidate.primaryUrl,
    evidenceMarkdown: candidate.evidenceMarkdown,
    recommendedNextApps: candidate.recommendedNextApps,
    proxyShapeRequest
  };
}
