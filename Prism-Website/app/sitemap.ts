import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://useprism.ai";
  const now = new Date();

  const routes: Array<{ url: string; priority: number; changeFrequency: "weekly" | "monthly" | "yearly" }> = [
    // Core
    { url: "/", priority: 1.0, changeFrequency: "weekly" },
    { url: "/pricing", priority: 0.9, changeFrequency: "weekly" },
    { url: "/product", priority: 0.9, changeFrequency: "monthly" },
    { url: "/use-cases", priority: 0.9, changeFrequency: "monthly" },
    { url: "/contact", priority: 0.8, changeFrequency: "monthly" },
    { url: "/about", priority: 0.7, changeFrequency: "monthly" },
    { url: "/changelog", priority: 0.8, changeFrequency: "weekly" },
    // Docs
    { url: "/docs", priority: 0.9, changeFrequency: "weekly" },
    { url: "/docs/quickstart", priority: 0.9, changeFrequency: "weekly" },
    { url: "/docs/first-flow", priority: 0.8, changeFrequency: "weekly" },
    { url: "/docs/concepts", priority: 0.8, changeFrequency: "monthly" },
    // Blog
    { url: "/blog", priority: 0.8, changeFrequency: "weekly" },
    { url: "/blog/tandem-ai-alternatives", priority: 0.7, changeFrequency: "monthly" },
    { url: "/blog/in-app-ai-agent-build-vs-buy", priority: 0.7, changeFrequency: "monthly" },
    { url: "/blog/why-users-never-finish-onboarding", priority: 0.7, changeFrequency: "monthly" },
    { url: "/blog/measure-activation-rate", priority: 0.7, changeFrequency: "monthly" },
    { url: "/blog/what-is-ai-onboarding-agent", priority: 0.7, changeFrequency: "monthly" },
    // Legal & trust
    { url: "/security", priority: 0.6, changeFrequency: "monthly" },
    { url: "/status", priority: 0.5, changeFrequency: "weekly" },
    { url: "/legal/privacy", priority: 0.4, changeFrequency: "monthly" },
    { url: "/legal/terms", priority: 0.4, changeFrequency: "monthly" },
    // Product
    { url: "/integrations", priority: 0.7, changeFrequency: "weekly" },
    { url: "/affiliate", priority: 0.6, changeFrequency: "monthly" },
  ];

  return routes.map((r) => ({
    url: `${base}${r.url}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
