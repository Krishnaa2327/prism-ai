"use client";
import { useState } from "react";
import { DASHBOARD_URL } from "../../lib/config";
import { motion } from "framer-motion";
import Link from "next/link";
import { Check, X, ChevronDown } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    monthly: 0, annual: 0,
    inrMonthly: 0, inrAnnual: 0,
    desc: "For founders and early-stage teams",
    cta: "Start for free →",
    ctaHref: `${DASHBOARD_URL}/register`,
    features: [
      "3 AI agents",
      "100 Monthly Tracked Users",
      "White-label widget",
      "MCP connectors",
      "Knowledge base",
      "Basic analytics",
      "Hindi, Hinglish + 8 Indian languages",
      "Community support",
    ],
    popular: false,
  },
  {
    name: "Starter",
    monthly: 99, annual: 79,
    inrMonthly: 7_999, inrAnnual: 6_399,
    desc: "For growing SaaS products",
    cta: "Start free trial →",
    ctaHref: `${DASHBOARD_URL}/register?plan=starter`,
    features: [
      "Everything in Free, plus:",
      "10 AI agents",
      "1,000 Monthly Tracked Users",
      "Questions explorer",
      "Insights dashboard",
      "Conversation history",
      "Priority analytics (30-day)",
      "Email support (24h response)",
    ],
    popular: true,
  },
  {
    name: "Growth",
    monthly: 299, annual: 239,
    inrMonthly: 24_999, inrAnnual: 19_999,
    desc: "For scaling products",
    cta: "Get started →",
    ctaHref: `${DASHBOARD_URL}/register?plan=growth`,
    features: [
      "Everything in Starter, plus:",
      "Unlimited AI agents",
      "10,000 Monthly Tracked Users",
      "Slack escalation integration",
      "A/B flow experiments",
      "Priority email support",
      "Advanced analytics (90-day)",
      "Guardrails + sensitive field masking",
    ],
    popular: false,
  },
  {
    name: "Scale",
    monthly: 999, annual: 799,
    inrMonthly: 79_999, inrAnnual: 63_999,
    desc: "For high-growth teams",
    cta: "Contact us →",
    ctaHref: "mailto:hello@useprism.ai",
    features: [
      "Everything in Growth, plus:",
      "Unlimited MTU",
      "Custom retention period",
      "SLA (99.9% uptime)",
      "SSO / SAML",
      "Dedicated onboarding call",
      "Slack support channel",
      "Custom contract available",
    ],
    popular: false,
  },
];

const TABLE_FEATURES = [
  { name: "AI Agents", free: "3", starter: "10", growth: "Unlimited", scale: "Unlimited" },
  { name: "Monthly Tracked Users", free: "100", starter: "1,000", growth: "10,000", scale: "Unlimited" },
  { name: "MCP Connectors", free: true, starter: true, growth: true, scale: true },
  { name: "Knowledge Base", free: true, starter: true, growth: true, scale: true },
  { name: "Multilingual (Hindi + 8 langs)", free: true, starter: true, growth: true, scale: true },
  { name: "Questions Explorer", free: false, starter: true, growth: true, scale: true },
  { name: "Insights Dashboard", free: false, starter: true, growth: true, scale: true },
  { name: "Conversation History", free: false, starter: true, growth: true, scale: true },
  { name: "Slack Notifications", free: false, starter: true, growth: true, scale: true },
  { name: "Slack Integration", free: false, starter: false, growth: true, scale: true },
  { name: "A/B Experiments", free: false, starter: false, growth: true, scale: true },
  { name: "Guardrails", free: false, starter: false, growth: true, scale: true },
  { name: "Advanced Analytics", free: false, starter: false, growth: "90 days", scale: "Custom" },
  { name: "SSO / SAML", free: false, starter: false, growth: false, scale: true },
  { name: "SLA", free: false, starter: false, growth: false, scale: "99.9%" },
];

const FAQS = [
  { q: "Does the free tier expire?", a: "No. Free is free forever. You only pay when you grow past 100 MTUs or need features in a paid plan." },
  { q: "What happens when I hit my MTU limit?", a: "New users who haven't been seen this month won't start a session. Existing users that month still get full service. We don't cut off mid-session." },
  { q: "Can I change plans mid-month?", a: "Yes. Upgrades are prorated immediately. Downgrades take effect at the next billing cycle." },
  { q: "Do I need a credit card for the free plan?", a: "No. Sign up with email only." },
  { q: "What is an AI agent?", a: "One onboarding flow = one agent. You can have up to 3 simultaneously active flows on the free plan." },
  { q: "Is my users' data private?", a: "Session data is stored on your account and never used to train models. You can delete it at any time." },
  { q: "Do you offer annual billing?", a: "Yes — 20% discount vs monthly. Toggle above to see annual prices." },
  { q: "Do you offer INR billing for Indian customers?", a: "Yes. Toggle to ₹ INR above to see India pricing. Payments via Razorpay / Stripe India." },
  { q: "Is Hinglish / Hindi supported?", a: "Yes — Prism detects the user's language and responds in Hindi, Hinglish, Tamil, Telugu, Marathi, Gujarati, Kannada, Bengali, or Malayalam automatically." },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-brand mx-auto" />;
  if (value === false) return <span className="text-slate-300 text-lg">—</span>;
  return <span className="text-slate-700 text-sm font-medium">{value}</span>;
}

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors">
        <span className="font-semibold text-slate-900">{q}</span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform flex-shrink-0 ml-4 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 text-slate-600 leading-relaxed">{a}</div>}
    </div>
  );
}

function formatPrice(amount: number, currency: "usd" | "inr"): string {
  if (amount === 0) return "Free";
  if (currency === "inr") return `₹${amount.toLocaleString("en-IN")}`;
  return `$${amount}`;
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [currency, setCurrency] = useState<"usd" | "inr">("usd");

  return (
    <div className="pt-16">
      {/* Header */}
      <section className="bg-[#0a0a0f] py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/15 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-6">
            Transparent pricing — no &ldquo;Contact Sales&rdquo; nonsense
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6">
            Simple pricing.<br />
            <span className="text-brand">Grows with you.</span>
          </h1>
          <p className="text-xl text-slate-400 mb-10">Start free with real features. Upgrade only when your users do.</p>

          {/* Toggles */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-1.5">
              <button onClick={() => setAnnual(false)} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${!annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"}`}>Monthly</button>
              <button onClick={() => setAnnual(true)} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${annual ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"}`}>
                Annual
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">Save 20%</span>
              </button>
            </div>
            {/* Currency toggle */}
            <div className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1.5">
              <button onClick={() => setCurrency("usd")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${currency === "usd" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"}`}>$ USD</button>
              <button onClick={() => setCurrency("inr")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${currency === "inr" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"}`}>
                ₹ INR
                <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">🇮🇳</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="py-16 bg-bg-light">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {PLANS.map((plan) => {
              const price = currency === "inr"
                ? (annual ? plan.inrAnnual : plan.inrMonthly)
                : (annual ? plan.annual : plan.monthly);
              const monthlyPrice = currency === "inr" ? plan.inrMonthly : plan.monthly;
              const annualPrice = currency === "inr" ? plan.inrAnnual : plan.annual;
              const symbol = currency === "inr" ? "₹" : "$";
              const savings = annual && monthlyPrice > 0
                ? currency === "inr"
                  ? `Save ₹${((monthlyPrice - annualPrice) * 12).toLocaleString("en-IN")}/yr`
                  : `Save $${(monthlyPrice - annualPrice) * 12}/yr`
                : null;

              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`relative bg-white rounded-2xl border p-7 flex flex-col transition-all hover:shadow-lg ${plan.popular ? "border-brand shadow-brand-sm" : "border-slate-200"}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">Most Popular</div>
                  )}
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h2>
                    <p className="text-slate-400 text-sm mb-4">{plan.desc}</p>
                    <div className="flex items-baseline gap-1">
                      {price === 0 ? (
                        <span className="text-4xl font-black text-slate-900">Free</span>
                      ) : (
                        <>
                          <span className="text-4xl font-black text-slate-900">{symbol}{price.toLocaleString(currency === "inr" ? "en-IN" : "en-US")}</span>
                          <span className="text-slate-400">/mo</span>
                        </>
                      )}
                    </div>
                    {savings && <p className="text-green-600 text-xs mt-1">Billed annually · {savings}</p>}
                  </div>
                  <div className="flex-1 border-t border-slate-100 pt-6 mb-6">
                    <ul className="space-y-3">
                      {plan.features.map((f) => (
                        <li key={f} className={`flex items-start gap-2 text-sm ${f.startsWith("Everything") ? "text-slate-400 italic" : "text-slate-600"}`}>
                          {!f.startsWith("Everything") && <Check className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />}
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={plan.ctaHref}
                    className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.popular ? "bg-brand text-white hover:bg-brand-dark shadow-brand-sm hover:shadow-brand" : "border border-slate-200 text-slate-700 hover:border-brand/40 hover:text-brand"}`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* India note */}
          {currency === "inr" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center text-slate-500 text-sm mt-6"
            >
              🇮🇳 India pricing in INR · Payments via Razorpay / Stripe India · GST applicable as per government norms
            </motion.p>
          )}
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Full feature comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-center">
              <thead className="sticky top-16">
                <tr className="bg-slate-900 text-white">
                  <th className="p-4 text-left text-sm font-semibold w-56">Feature</th>
                  {["Free", "Starter", "Growth", "Scale"].map((p) => (
                    <th key={p} className={`p-4 text-sm font-semibold ${p === "Starter" ? "text-brand-light" : ""}`}>{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TABLE_FEATURES.map((row, i) => (
                  <tr key={row.name} className={`border-t border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50"}`}>
                    <td className="p-4 text-sm font-medium text-slate-700 text-left">{row.name}</td>
                    <td className="p-4"><Cell value={row.free} /></td>
                    <td className="p-4"><Cell value={row.starter} /></td>
                    <td className="p-4"><Cell value={row.growth} /></td>
                    <td className="p-4"><Cell value={row.scale} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MTU explainer */}
      <section className="py-8 bg-bg-light">
        <div className="max-w-3xl mx-auto px-6">
          <details className="bg-white border border-slate-200 rounded-2xl p-6">
            <summary className="font-semibold text-slate-900 cursor-pointer flex items-center justify-between">
              What is an MTU?
              <ChevronDown className="w-5 h-5 text-slate-400" />
            </summary>
            <div className="mt-4 text-slate-600 leading-relaxed space-y-3">
              <p>A Monthly Tracked User (MTU) is any unique end user who starts an onboarding session in a given calendar month. A user who visits 50 times is still 1 MTU. The counter resets on the 1st of every month.</p>
              <p className="text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                <strong>Example:</strong> If you have 200 users who start onboarding in January, that&apos;s 200 MTUs. Users who don&apos;t interact with Prism don&apos;t count.
              </p>
            </div>
          </details>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((f) => <Faq key={f.q} {...f} />)}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-16 bg-bg-light border-t border-slate-100">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Still unsure? Talk to a founder.</h2>
          <p className="text-slate-500 mb-8">We&apos;ll look at your onboarding flow together and tell you honestly whether Prism will help — or not.</p>
          <Link href="https://cal.com/useprism" className="inline-flex items-center gap-2 px-8 py-4 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-all shadow-brand-sm hover:shadow-brand">
            Book 20-min call →
          </Link>
        </div>
      </section>
    </div>
  );
}
