import { NextRequest } from "next/server";

function firstHeaderValue(value: string | null): string | undefined {
  return value?.split(",")[0]?.trim() || undefined;
}

function forwardedParam(forwarded: string | null, key: "host" | "proto"): string | undefined {
  const first = firstHeaderValue(forwarded);
  if (!first) return undefined;

  for (const part of first.split(";")) {
    const [rawKey, ...rawValue] = part.split("=");
    if (rawKey?.trim().toLowerCase() !== key) continue;
    return rawValue.join("=").trim().replace(/^"|"$/g, "") || undefined;
  }
}

export function getPublicOrigin(request: NextRequest): string {
  const requestUrl = new URL(request.url);
  const forwarded = request.headers.get("forwarded");
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ||
    forwardedParam(forwarded, "host") ||
    request.headers.get("host") ||
    requestUrl.host;
  const proto =
    firstHeaderValue(request.headers.get("x-forwarded-proto")) ||
    forwardedParam(forwarded, "proto") ||
    requestUrl.protocol.replace(":", "");

  return `${proto}://${host}`;
}
