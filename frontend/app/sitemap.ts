import type { MetadataRoute } from "next";

const baseUrl = "https://www.carsgidi.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/reserve",
    "/privacy-policy",
    "/terms-and-conditions",
    "/terms-and-condition",
    "/ga-rental-terms",
    "/policies",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/reserve" ? 0.9 : 0.7,
  }));
}