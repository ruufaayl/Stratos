import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://stratos.ai";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/proof", "/privacy", "/terms"],
        disallow: ["/app/", "/api/", "/sign-in", "/sign-up", "/post-auth/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
