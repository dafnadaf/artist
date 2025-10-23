import { Router } from "express";
import Work from "../models/Work.js";

const router = Router();

function getSiteBaseUrl(request) {
  const configured = process.env.PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const protocol = request.protocol;
  const host = request.get("host");
  return `${protocol}://${host}`;
}

router.get("/sitemap.xml", async (request, response, next) => {
  try {
    const baseUrl = getSiteBaseUrl(request);
    const staticUrls = [
      { loc: baseUrl, priority: "1.0", changefreq: "weekly" },
      { loc: `${baseUrl}/catalog`, priority: "0.9", changefreq: "daily" },
      { loc: `${baseUrl}/about`, priority: "0.6", changefreq: "monthly" },
      { loc: `${baseUrl}/contact`, priority: "0.5", changefreq: "monthly" },
    ];

    const works = await Work.find().select("updatedAt").lean();

    const workUrls = works.map((work) => ({
      loc: `${baseUrl}/catalog/${work._id.toString()}`,
      priority: "0.8",
      changefreq: "weekly",
      lastmod: work.updatedAt ? new Date(work.updatedAt).toISOString() : undefined,
    }));

    const urls = [...staticUrls, ...workUrls];

    const body = [`<?xml version="1.0" encoding="UTF-8"?>`, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

    for (const url of urls) {
      body.push("  <url>");
      body.push(`    <loc>${url.loc}</loc>`);
      if (url.lastmod) {
        body.push(`    <lastmod>${url.lastmod}</lastmod>`);
      }
      if (url.changefreq) {
        body.push(`    <changefreq>${url.changefreq}</changefreq>`);
      }
      if (url.priority) {
        body.push(`    <priority>${url.priority}</priority>`);
      }
      body.push("  </url>");
    }

    body.push("</urlset>");

    response.type("application/xml").send(body.join("\n"));
  } catch (error) {
    next(error);
  }
});

router.get("/robots.txt", (request, response) => {
  const baseUrl = getSiteBaseUrl(request);
  response.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`);
});

export default router;
