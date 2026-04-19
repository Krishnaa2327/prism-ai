"use client";
import { useState } from "react";
import Link from "next/link";
import { API_URL, DASHBOARD_URL } from "../../lib/config";
import { Mail, Calendar, MessageSquare, ArrowRight, CheckCircle, Zap } from "lucide-react";
import { motion } from "framer-motion";

const options = [
  {
    icon: Calendar,
    title: "Book a 20-min demo",
    desc: "See Prism in a live product, ask questions, and decide if it's right for you. Zero pitch energy.",
    cta: "Book a call →",
    href: "https://cal.com/useprism",
    primary: true,
  },
  {
    icon: Mail,
    title: "Email us directly",
    desc: "Prefer async? hello@useprism.ai. We reply within one business day, usually faster.",
    cta: "Send an email →",
    href: "mailto:hello@useprism.ai",
    primary: false,
  },
  {
    icon: MessageSquare,
    title: "Self-serve first",
    desc: "Start free, install the widget, build a flow. If you hit something weird, we're right there.",
    cta: "Start for free →",
    href: `${DASHBOARD_URL}/register`,
    primary: false,
  },
];

const faqs = [
  {
    q: "Do I need a credit card to start?",
    a: "No. Sign up with email only on the free plan. You get 3 AI agents and 100 MTU — enough to see real results before paying anything.",
  },
  {
    q: "How long does setup take?",
    a: "The widget install is 2 lines of script — under 5 minutes. Your first flow takes another 10–15 minutes to build and publish. Most teams see their first session within an hour of signing up.",
  },
  {
    q: "Can I get a demo before signing up?",
    a: "Yes — book a 20-minute call above. We'll show you Prism running in a real SaaS product and walk through a live flow build. No sales engineer, no deck.",
  },
  {
    q: "We're on enterprise procurement. Can you help?",
    a: "Yes. Reach out to hello@useprism.ai with \"Enterprise\" in the subject. We can provide SOC 2 documentation, a custom DPA, and a custom contract for Scale plan customers.",
  },
  {
    q: "What if Prism doesn't work for our product?",
    a: "We'll tell you honestly on the demo call if we think it will or won't help. If you've started a paid plan within the last 7 days and it's not working, email us and we'll sort it out.",
  },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "", useCase: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/v1/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch {
      // show success regardless — don't block the user
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="pt-16 bg-white">
      {/* Hero */}
      <section className="bg-[#0a0a0f] py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-brand/12 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-brand/30 bg-brand/10 text-brand-light text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5" />
            No sales process. No gatekeeping.
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Talk to us.<br />
            <span className="gradient-text">We're pretty responsive.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-xl mx-auto leading-relaxed">
            Book a live demo, send an email, or just start free and build your first flow today.
          </p>
        </div>
      </section>

      {/* Contact options */}
      <section className="py-16 bg-[#fafbfc] border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {options.map((opt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border p-7 flex flex-col transition-all hover:shadow-lg ${
                  opt.primary
                    ? "border-brand bg-gradient-to-b from-brand/5 to-purple-50/30 shadow-brand-sm"
                    : "border-slate-200 bg-white"
                }`}
              >
                {opt.primary && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full w-fit mb-4">
                    ⭐ Recommended
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${opt.primary ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-500"}`}>
                  <opt.icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-black text-slate-900 mb-2">{opt.title}</h2>
                <p className="text-slate-500 text-sm leading-relaxed flex-1 mb-6">{opt.desc}</p>
                <Link
                  href={opt.href}
                  target={opt.href.startsWith("http") ? "_blank" : undefined}
                  className={`inline-flex items-center gap-2 text-sm font-bold transition-all ${
                    opt.primary
                      ? "text-white bg-brand hover:bg-brand-dark px-5 py-2.5 rounded-xl shadow-brand-sm"
                      : "text-brand hover:text-brand-dark"
                  }`}
                >
                  {opt.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            {/* Left: form */}
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-3">Send us a message</h2>
              <p className="text-slate-500 mb-8">We respond within one business day. For faster help, book a call above.</p>

              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-black text-slate-900 mb-2">Message sent!</h3>
                  <p className="text-slate-500">We'll reply to {form.email} within one business day.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name *</label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Alex Chen"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Work email *</label>
                      <input
                        required
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="alex@company.com"
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Company</label>
                    <input
                      type="text"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      placeholder="Acme Inc."
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">What are you trying to solve?</label>
                    <select
                      value={form.useCase}
                      onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors text-slate-600 bg-white"
                    >
                      <option value="">Select a use case…</option>
                      <option value="onboarding">SaaS user onboarding</option>
                      <option value="support">Support deflection</option>
                      <option value="setup">Complex setup / integration flows</option>
                      <option value="internal">Internal tooling</option>
                      <option value="other">Something else</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message *</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us about your product, what you're building, and what's not working with your current onboarding…"
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-brand hover:bg-brand-dark text-white font-bold rounded-xl transition-all shadow-brand-sm hover:shadow-brand disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>Send message <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                  <p className="text-slate-400 text-xs text-center">
                    By submitting, you agree to our{" "}
                    <Link href="/legal/privacy" className="underline hover:text-brand">Privacy Policy</Link>.
                  </p>
                </form>
              )}
            </div>

            {/* Right: FAQ */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-6">Before you reach out</h2>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <div key={i} className="border border-slate-200 rounded-xl p-5">
                    <p className="font-bold text-slate-900 mb-2 text-sm">{faq.q}</p>
                    <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 bg-brand/5 border border-brand/20 rounded-2xl">
                <p className="text-sm font-bold text-slate-900 mb-1">Security or privacy questions?</p>
                <p className="text-slate-500 text-sm mb-3">We have a dedicated team for compliance, DPA, and security review.</p>
                <a href="mailto:security@useprism.ai" className="text-brand text-sm font-semibold hover:text-brand-dark transition-colors">
                  security@useprism.ai →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
