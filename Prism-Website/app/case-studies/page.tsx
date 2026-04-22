import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Case Studies — Prism",
  description: "Real numbers from real teams using Prism AI onboarding.",
};

const caseStudies = [
  {
    slug: "example-startup",
    company: "Example Startup",
    industry: "B2B SaaS",
    plan: "Starter",
    quote: "We found the exact step where users were dropping off in the first 20 minutes. Prism paid for itself in the first week.",
    before: 23,
    after: 41,
    lift: 18,
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="pt-16">
      <section className="bg-bg-light py-16 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-5xl font-black text-slate-900 mb-3">Case Studies</h1>
          <p className="text-xl text-slate-500">Real numbers from real teams using Prism.</p>

          {/* Stat bar */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            {[
              { value: "+18%", label: "avg activation lift" },
              { value: "11 days", label: "avg time to first result" },
              { value: "Growing", label: "companies" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl font-black text-brand mb-1">{s.value}</p>
                <p className="text-slate-500 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 space-y-6">
          {caseStudies.map((cs) => (
            <div key={cs.slug} className="border border-slate-200 rounded-2xl p-8 hover:border-brand/30 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{cs.company}</h2>
                  <div className="flex gap-2 mt-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">{cs.industry}</span>
                    <span className="px-2.5 py-1 bg-brand/10 text-brand text-xs rounded-full font-medium">{cs.plan}</span>
                  </div>
                </div>
              </div>
              <p className="text-xl text-slate-600 italic mb-6 border-l-4 border-brand pl-4">"{cs.quote}"</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-2xl font-black text-red-500">{cs.before}%</p>
                  <p className="text-xs text-red-400 mt-1">Before</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-2xl font-black text-green-500">{cs.after}%</p>
                  <p className="text-xs text-green-400 mt-1">After</p>
                </div>
                <div className="text-center p-4 bg-brand/5 rounded-xl">
                  <p className="text-2xl font-black text-brand">+{cs.lift}%</p>
                  <p className="text-xs text-brand/60 mt-1">Lift</p>
                </div>
              </div>
              <Link href={`/case-studies/${cs.slug}`} className="flex items-center gap-2 text-brand font-semibold hover:text-brand-dark transition-colors">
                Read case study <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
