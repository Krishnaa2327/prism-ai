import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Prism",
  description: "Practical guides on SaaS onboarding, activation, and AI.",
};

const articles = [
  {
    slug: "tandem-ai-alternatives",
    title: "Best Tandem AI alternatives for B2B SaaS in 2026",
    excerpt: "A comprehensive comparison of AI onboarding tools — what they cost, what they actually do, and which one fits your stage.",
    date: "April 10, 2026",
    readTime: "8 min read",
    tag: "Comparison",
    featured: true,
  },
  {
    slug: "in-app-ai-agent-build-vs-buy",
    title: "In-app AI agent for SaaS onboarding: build vs. buy in 2026",
    excerpt: "Engineering it yourself sounds great until you're debugging selector drift at 2am. Here's the real calculus.",
    date: "April 7, 2026",
    readTime: "6 min read",
    tag: "Guide",
  },
  {
    slug: "why-users-never-finish-onboarding",
    title: "Why 60% of SaaS users never finish onboarding (and what to do about it)",
    excerpt: "The data is damning. Most users leave in the first 5 minutes. Here's why — and what actually works.",
    date: "March 30, 2026",
    readTime: "7 min read",
    tag: "Guide",
  },
  {
    slug: "measure-activation-rate",
    title: "How to measure activation rate: the only metric that predicts retention",
    excerpt: "Your dashboard shows MAU. Your investors ask about churn. Neither explains why users are leaving. Activation does.",
    date: "March 24, 2026",
    readTime: "5 min read",
    tag: "Guide",
  },
  {
    slug: "what-is-ai-onboarding-agent",
    title: "What is an AI onboarding agent? (And why it's different from a chatbot)",
    excerpt: "A chatbot talks. An onboarding agent acts. Here's the difference, and why it matters for your activation rate.",
    date: "March 18, 2026",
    readTime: "4 min read",
    tag: "Guide",
  },
];

const tagColors: Record<string, string> = {
  Comparison: "bg-purple-100 text-purple-700",
  Guide: "bg-blue-100 text-blue-700",
  "Case Studies": "bg-green-100 text-green-700",
  "Product Updates": "bg-orange-100 text-orange-700",
};

export default function BlogPage() {
  const [featured, ...rest] = articles;
  return (
    <div className="pt-16">
      {/* Header */}
      <section className="bg-bg-light py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-5xl font-black text-slate-900 mb-3">Blog</h1>
          <p className="text-xl text-slate-500">Practical guides on SaaS onboarding, activation, and AI.</p>
          {/* Filter tabs */}
          <div className="flex gap-2 mt-8 flex-wrap">
            {["All", "Guides", "Case Studies", "Product Updates"].map((tab) => (
              <button key={tab} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === "All" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800 border border-slate-200 bg-white hover:bg-slate-50"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          {/* Featured article */}
          <Link href={`/blog/${featured.slug}`} className="block group mb-12">
            <div className="rounded-3xl overflow-hidden border border-slate-200 hover:border-brand/30 hover:shadow-xl transition-all">
              <div className="h-56 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#4f46e5] flex items-center justify-center relative">
                <div className="absolute inset-0 bg-grid opacity-30" />
                <span className={`relative z-10 px-3 py-1 rounded-full text-xs font-bold ${tagColors[featured.tag]}`}>{featured.tag}</span>
              </div>
              <div className="p-8">
                <h2 className="text-3xl font-black text-slate-900 mb-3 group-hover:text-brand transition-colors">{featured.title}</h2>
                <p className="text-slate-500 text-lg mb-4">{featured.excerpt}</p>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <span>{featured.date}</span>
                  <span>·</span>
                  <span>{featured.readTime}</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`} className="group block rounded-2xl border border-slate-200 overflow-hidden hover:border-brand/30 hover:shadow-lg transition-all">
                <div className="h-36 bg-gradient-to-br from-slate-900 to-slate-700 flex items-end p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tagColors[article.tag]}`}>{article.tag}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-brand transition-colors leading-snug">{article.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2 mb-4">{article.excerpt}</p>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
