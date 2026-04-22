import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Server, Eye, CheckCircle, FileText, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Security — Prism",
  description: "How Prism keeps your data and your users' data safe. SOC 2, encryption at rest and in transit, data residency, and more.",
};

const pillars = [
  {
    icon: Lock,
    title: "Encryption everywhere",
    desc: "All data encrypted at rest (AES-256) and in transit (TLS 1.3). Encryption keys are rotated automatically. Session transcripts stored encrypted, tied to customer isolation.",
    badges: ["AES-256 at rest", "TLS 1.3 in transit", "Key rotation"],
    color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    iconColor: "text-indigo-600",
  },
  {
    icon: Eye,
    title: "No training on your data",
    desc: "Prism never uses your users' conversations or your product content to train AI models. Transcripts are yours — export or delete at any time. We process, we do not learn from.",
    badges: ["Zero AI training", "User-owned data", "Delete anytime"],
    color: "text-rose-600 bg-rose-50 border-rose-100",
    iconColor: "text-rose-500",
  },
  {
    icon: Server,
    title: "Infrastructure & access control",
    desc: "Deployed on AWS us-east-1 and eu-west-1. Customer data is siloed by tenant. Prism employees cannot read your session transcripts without explicit support request and audit log.",
    badges: ["AWS multi-region", "Tenant isolation", "Audit logs"],
    color: "text-emerald-600 bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    icon: FileText,
    title: "Compliance",
    desc: "SOC 2 Type II report in progress (expected Q3 2026). GDPR-compliant data processing agreements available on request. CCPA compliant for California consumers.",
    badges: ["SOC 2 (in progress)", "GDPR DPA", "CCPA"],
    color: "text-amber-600 bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
  },
];

const practices = [
  "Session transcripts retained for 90 days by default (configurable)",
  "API keys hashed using bcrypt — never stored in plaintext",
  "Role-based access control — limit dashboard access by team",
  "Vulnerability disclosure program — report to security@useprism.ai",
  "Regular third-party penetration testing",
  "Dependency scanning and automated CVE alerts via GitHub Dependabot",
  "Single Sign-On (SSO) via SAML 2.0 on Growth plan and above",
  "IP allowlist support for API access on Scale plan",
];

export default function SecurityPage() {
  return (
    <div className="pt-16 bg-white">
      {/* Hero */}
      <div className="relative bg-[#06060f] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-64 bg-brand/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-8">
            <Shield className="w-4 h-4" />
            Security at Prism
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Built with security
            <br />
            <span className="text-brand">from the ground up.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Your data and your users&apos; data never leaves your control. Here&apos;s exactly what we do to keep it safe.
          </p>
        </div>
      </div>

      {/* Security pillars */}
      <div className="max-w-5xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {pillars.map((pillar, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-100 bg-white p-8 hover:border-slate-200 hover:shadow-md transition-all"
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border mb-5 ${pillar.color}`}>
                <pillar.icon className={`w-5 h-5 ${pillar.iconColor}`} />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-3">{pillar.title}</h2>
              <p className="text-slate-500 leading-relaxed mb-5">{pillar.desc}</p>
              <div className="flex flex-wrap gap-2">
                {pillar.badges.map((badge, j) => (
                  <span key={j} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${pillar.color}`}>
                    <CheckCircle className="w-3 h-3" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Security practices */}
        <div className="rounded-3xl bg-[#fafbfc] border border-slate-100 p-10 mb-16">
          <h2 className="text-2xl font-black text-slate-900 mb-8">Security practices</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {practices.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle className="w-4 h-4 text-brand mt-0.5 flex-shrink-0" />
                <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Responsible disclosure */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 mb-16">
          <h2 className="text-xl font-black text-slate-900 mb-3">Responsible disclosure</h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Found a vulnerability? We take security reports seriously and will respond within 24 hours.
            We follow responsible disclosure: report to us first, give us 90 days to patch, then you can publish.
          </p>
          <a
            href="mailto:security@useprism.ai"
            className="inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-dark transition-colors"
          >
            security@useprism.ai <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Questions CTA */}
        <div className="text-center border-t border-slate-100 pt-16">
          <h2 className="text-2xl font-black text-slate-900 mb-3">Questions about our security posture?</h2>
          <p className="text-slate-500 mb-8 max-w-lg mx-auto">
            We&apos;re happy to share penetration test summaries, answer specific compliance questions, or sign a custom DPA.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:security@useprism.ai"
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors shadow-brand-sm"
            >
              Contact security team
            </a>
            <Link
              href="/legal/terms"
              className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:border-brand/30 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
