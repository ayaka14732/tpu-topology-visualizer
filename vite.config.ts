import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { seo, siteUrl, repositoryUrl } from "./src/seo.ts";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "static-seo",
      transformIndexHtml(html) {
        const copy = seo.en;
        const escape = (value: string) =>
          value
            .replaceAll("&", "&amp;")
            .replaceAll('"', "&quot;")
            .replaceAll("<", "&lt;");
        const schema = {
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "TPU Topology Visualizer",
          url: siteUrl,
          description: copy.description,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Any",
          browserRequirements: "Requires JavaScript and WebGL 2",
          isAccessibleForFree: true,
          inLanguage: ["en", "fr", "zh-CN"],
          image: `${siteUrl}social-preview.png`,
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        };
        return html
          .replace(
            "<!--seo-head-->",
            `
        <title>${escape(copy.title)}</title>
        <meta name="description" content="${escape(copy.description)}">
        <meta name="robots" content="index,follow,max-image-preview:large">
        <link rel="canonical" href="${siteUrl}">
        <link rel="sitemap" type="application/xml" href="${siteUrl}sitemap.xml">
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="TPU Topology Visualizer">
        <meta property="og:title" content="${escape(copy.title)}">
        <meta property="og:description" content="${escape(copy.description)}">
        <meta property="og:url" content="${siteUrl}">
        <meta property="og:image" content="${siteUrl}social-preview.png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">
        <meta property="og:image:alt" content="3D TPU network with chips and colored interconnects">
        <meta property="og:locale" content="en_US">
        <meta property="og:locale:alternate" content="fr_FR">
        <meta property="og:locale:alternate" content="zh_CN">
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="${escape(copy.title)}">
        <meta name="twitter:description" content="${escape(copy.description)}">
        <meta name="twitter:image" content="${siteUrl}social-preview.png">
        <script type="application/ld+json">${JSON.stringify(schema).replaceAll("<", "\\u003c")}</script>
      `,
          )
          .replace(
            "<!--seo-content-->",
            `<main class="static-introduction"><h1>TPU Topology Visualizer</h1><h2>${copy.heading}</h2><p>${copy.body}</p><p>${copy.help}</p><a href="${repositoryUrl}">${copy.source}</a></main>`,
          );
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "sitemap.xml",
          source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${siteUrl}</loc></url></urlset>`,
        });
      },
    },
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /node_modules\/three/ }],
        },
      },
    },
  },
});
