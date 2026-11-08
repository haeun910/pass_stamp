import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** 앱 화면은 개인 데이터가 있는 곳이라 검색엔진에서 빼고, 소개·요금·약관만 노출해요. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/pricing", "/terms", "/privacy"], disallow: ["/app", "/apply", "/profile", "/settings", "/print", "/api"] },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
