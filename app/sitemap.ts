import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://leptum.mpeters.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/timeline",
    "/impact",
    "/routines",
    "/goals",
    "/insights",
    "/stacks",
    "/settings",
  ];

  return routes.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.8,
  }));
}
