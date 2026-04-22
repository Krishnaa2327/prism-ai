import type { Metadata } from "next";
import Link from "next/link";
import { DollarSign, Users, BarChart2, ArrowRight, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Affiliate Program — Prism",
  description: "Earn 30% recurring commission for every customer you refer to Prism. Join founders, agencies, and growth consultants who earn with Prism.",
};

const tiers = [
  {
    name: "Starter",
    commission: "20%",
    requirement: "1–4 active referrals",
    payout: "Monthly",
    perks: ["Affiliate dashboard", "Custom link", "Prism swag kit"],
  },
  {
    name: "Partner",
    commission: "30%",
    requirement: "5–19 active referrals",
    payout: "Monthly",
    perks: ["Everything in Starter", "Co-marketing opportunities", "Priority support"],
    highlighted: true,
  },
  {
    name: "Agency",
    commission: "40%",
    requirement: "20+ active referrals",
    payout: "Bi-weekly",
    perks: ["Everything in Partner", "Dedicated account manager", "Joint case studies", "White-label option"],
  },
];

const faqs = [
  {
    q: "How does attribution work?",
    a: "Each affiliate gets a unique referral link. We attribute signups for 60 days via first-touch cookie. If someone signs up within 60 days of clicking your link, you earn commission.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are paid monthly (Starter/Partner) or bi-weekly (Agency) via Stripe, 30 days after the referred customer's payment clears.",
  },
  {
    q: "What counts as an 'active referral'?",
    a: "A referral who has been on a paid plan for at least one billing cycle without churning.",
  },
  {
    q: "Is there a cap on earnings?",
    a: "No cap. If you refer 100 paid customers, you earn 30–40% of their recurring revenue every month.",
  },
  {
    q: "Can I refer myself?",
    a: "No — self-referrals are not permitted and will result in affiliate account termination.",
  },
];

export default function AffiliatePage() {
  return (
    <div className="pt-16 bg-white">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#06060f] via-[#0f0f2a] to-[#1a1040] overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-48 bg-brand/10 blur-3xl rounded-full" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-bold mb-8">
            <DollarSign className="w-4 h-4" />
            Affiliate Program
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
            Earn 30% recurring
            <br />
            <span className="text-brand">for every referral.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed mb-10">
            Refer SaaS founders, product teams, or growth leads to Prism — and earn a percentage of their subscription every single month, for as long as they stay.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:partners@useprism.ai?subject=Affiliate application"
              className="inline-flex items-center gap-2 px-8 py-4 bg-brand hover:bg-brand-dark text-white font-bold text-lg rounded-xl transition-all shadow-brand hover:scale-[1.02]"
            >
              Apply to join <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-8 py-4 border border-white/15 hover:border-white/30 text-white font-semibold text-lg rounded-xl transition-all"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-y border-slate-100 bg-[#fafbfc]">
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-3 gap-6 text-center">
          {[
            { icon: DollarSign, value: "Up to 40%", label: "Recurring commission" },
            { icon: Users, value: "60 days", label: "Attribution window" },
            { icon: BarChart2, value: "$0", label: "Cost to join" },
          ].map((stat, i) => (
            <div key={i}>
              <p className="text-2xl md:text-3xl font-black text-slate-900 mb-1">{stat.value}</p>
              <p className="text-slate-500 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tiers */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">Commission tiers</p>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900">More referrals, higher rates.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {tiers.map((tier, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-8 relative transition-all ${
                tier.highlighted
                  ? "border-brand bg-gradient-to-b from-brand/5 to-purple-50/40 shadow-lg"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-bold px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}
              <p className={`text-sm font-bold mb-1 ${tier.highlighted ? "text-brand" : "text-slate-500"}`}>{tier.name}</p>
              <p className="text-5xl font-black text-slate-900 mb-1">{tier.commission}</p>
              <p className="text-slate-400 text-sm mb-2">recurring commission</p>
              <p className="text-xs text-slate-500 border-t border-slate-100 pt-3 mb-5">{tier.requirement} · Paid {tier.payout}</p>
              <ul className="space-y-2">
                {tier.perks.map((perk, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlighted ? "text-brand" : "text-emerald-500"}`} />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mb-20">
          <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { n: "01", title: "Apply", desc: "Email partners@useprism.ai with your name, audience, and how you plan to promote Prism." },
              { n: "02", title: "Get approved", desc: "We review applications within 2 business days and issue your unique referral link." },
              { n: "03", title: "Share", desc: "Promote Prism via blog, newsletter, social, or directly to your clients and network." },
              { n: "04", title: "Earn", desc: "Get paid monthly via Stripe for every paying customer you refer, for as long as they stay." },
            ].map((step, i) => (
              <div key={i} className="bg-[#fafbfc] border border-slate-100 rounded-2xl p-6">
                <div className="text-4xl font-black text-slate-100 mb-3">{step.n}</div>
                <h3 className="font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-20">
          <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">FAQ</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6">
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{faq.q}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-brand/5 to-purple-50 border border-brand/15 rounded-3xl p-12">
          <h2 className="text-3xl font-black text-slate-900 mb-3">Ready to start earning?</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">Applications are reviewed within 2 business days. No follower count minimums.</p>
          <a
            href="mailto:partners@useprism.ai?subject=Affiliate application"
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-brand-sm"
          >
            Apply now — partners@useprism.ai
          </a>
        </div>
      </div>
    </div>
  );
}
