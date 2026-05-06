import { NextResponse } from "next/server";
import type { AssemblyProxyNoticeHandoff } from "@assembly/shared-types/handoffs";
import { requireApiContext } from "@/lib/auth/api";
import { getContentItem, updateContentItem } from "@/lib/content/service";

function getRegistryExportId(value: unknown): string | undefined {
  const sourceLink =
    value && typeof value === "object" && typeof (value as { sourceLink?: unknown }).sourceLink === "string"
      ? (value as { sourceLink: string }).sourceLink
      : "";

  return sourceLink.startsWith("registry-handoff:") ? sourceLink.replace("registry-handoff:", "") : undefined;
}

function asAiMeta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function persistProxyAttempt(input: {
  workspaceId: string;
  userId: string;
  item: Awaited<ReturnType<typeof getContentItem>> extends infer Item ? NonNullable<Item> : never;
  endpoint?: string | undefined;
  traceId: string;
  status: "ok" | "failed" | "fallback";
  message?: string | undefined;
  shapedText?: string | undefined;
}) {
  const aiMeta = asAiMeta(input.item.aiMeta);
  const attempt = {
    attemptedAt: new Date().toISOString(),
    endpoint: input.endpoint,
    traceId: input.traceId,
    status: input.status,
    message: input.message
  };
  const proxyDeliveryAttempts = Array.isArray(aiMeta.proxyDeliveryAttempts)
    ? [attempt, ...aiMeta.proxyDeliveryAttempts].slice(0, 20)
    : [attempt];
  const proxyShapedOutputs =
    input.shapedText && input.shapedText.trim()
      ? [
          {
            shapedAt: attempt.attemptedAt,
            endpoint: input.endpoint,
            traceId: input.traceId,
            text: input.shapedText
          },
          ...(Array.isArray(aiMeta.proxyShapedOutputs) ? aiMeta.proxyShapedOutputs : [])
        ].slice(0, 10)
      : aiMeta.proxyShapedOutputs;

  await updateContentItem(input.workspaceId, input.item.id, {
    aiMeta: {
      ...aiMeta,
      proxyDeliveryAttempts,
      ...(proxyShapedOutputs ? { proxyShapedOutputs } : {}),
      proxyDelivery: {
        deliveredAt: attempt.attemptedAt,
        endpoint: input.endpoint,
        traceId: input.traceId,
        status: input.status,
        shapedText: input.shapedText
      }
    },
    actorUserId: input.userId
  });
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiContext("CONTENT_OPS");
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const contentItemId = typeof body?.contentItemId === "string" ? body.contentItemId : "";
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.trim() : process.env.ASSEMBLY_PROXY_SHAPE_URL;
    const deliver = body?.deliver === true;
    if (!contentItemId) {
      return NextResponse.json({ ok: false, error: "contentItemId is required." }, { status: 400 });
    }

    const item = await getContentItem(auth.context.workspaceId, contentItemId);
    if (!item) {
      return NextResponse.json({ ok: false, error: "Content item not found." }, { status: 404 });
    }

    const title = item.title ?? "Assembly notice handoff";
    const draftText = item.body || item.rawInput || item.summary || title;
    const sourceRegistryExportId = getRegistryExportId(item.structured);
    const exportedAt = new Date().toISOString();
    const payload: AssemblyProxyNoticeHandoff = {
      schema: "tenra-assembly.proxy-notice-handoff.v1",
      exportedAt,
      sourceApp: "assembly",
      contentItemId: item.id,
      title,
      draftText,
      sourceRegistryExportId,
      proxyShapeRequest: {
        clientApp: "assembly",
        surface: "internal-note",
        profileId: "profile:default",
        purpose: "Shape a Registry-backed Assembly notice before customer-facing review.",
        draftText,
        audience: "content operator",
        sourceArtifact: {
          schema: "tenra-registry.assembly-document-request.v1",
          artifactId: sourceRegistryExportId,
          exportedAt
        },
        hardConstraints: ["Do not publish directly", "Keep Registry source context visible"],
        traceId: `assembly-proxy-${item.id}`
      }
    };

    if (!deliver) {
      return NextResponse.json({ ok: true, delivered: false, handoff: payload });
    }

    if (!endpoint) {
      await persistProxyAttempt({
        workspaceId: auth.context.workspaceId,
        userId: auth.context.user.id,
        item,
        traceId: payload.proxyShapeRequest.traceId,
        status: "fallback",
        message: "ASSEMBLY_PROXY_SHAPE_URL is not configured."
      });
      return NextResponse.json({
        ok: true,
        delivered: false,
        deliveryMode: "json-fallback",
        handoff: payload,
        error: "ASSEMBLY_PROXY_SHAPE_URL is not configured."
      });
    }

    const proxyResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload.proxyShapeRequest)
    });

    if (!proxyResponse.ok) {
      const error = await proxyResponse.text();
      await persistProxyAttempt({
        workspaceId: auth.context.workspaceId,
        userId: auth.context.user.id,
        item,
        endpoint,
        traceId: payload.proxyShapeRequest.traceId,
        status: "failed",
        message: error
      });
      return NextResponse.json({
        ok: true,
        delivered: false,
        deliveryMode: "json-fallback",
        handoff: payload,
        error
      });
    }

    const proxyBody = (await proxyResponse.json().catch(() => ({}))) as {
      result?: { text?: string };
      text?: string;
    };
    const shapedText = proxyBody.result?.text ?? proxyBody.text ?? "";
    await persistProxyAttempt({
      workspaceId: auth.context.workspaceId,
      userId: auth.context.user.id,
      item,
      endpoint,
      traceId: payload.proxyShapeRequest.traceId,
      status: "ok",
      shapedText
    });

    await updateContentItem(auth.context.workspaceId, item.id, {
      body: shapedText ? `${draftText}\n\n## Proxy shaped output\n\n${shapedText}` : draftText,
      actorUserId: auth.context.user.id
    });

    return NextResponse.json({
      ok: true,
      delivered: true,
      deliveryMode: "direct-post",
      handoff: payload,
      proxy: proxyBody
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assembly Proxy handoff failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
