import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.243 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export const metadata: Metadata = {
  title: "About — Prism",
  description: "We're building the onboarding layer for B2B SaaS.",
};

export default function AboutPage() {
  return (
    <div className="pt-16">
      {/* Mission */}
      <section className="bg-[#0a0a0f] py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand/15 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            We&apos;re building the onboarding layer for B2B SaaS.
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed">
            Not another analytics tool. Not another chatbot.
            <br />
            An AI agent that actually <em className="text-white">does things</em> — and shows operators exactly what it did and where it failed.
          </p>
        </div>
      </section>

      {/* Why we built this */}
      <section className="py-24 bg-white">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-3xl font-black text-slate-900 mb-8">Why we built this</h2>
          <div className="prose prose-slate space-y-5">
            <p className="text-slate-600 leading-relaxed text-lg">
              We watched founders spend months building onboarding flows that users ignored. Fancy product tours, interactive walkthroughs, in-app checklists — all with single-digit completion rates.
            </p>
            <p className="text-slate-600 leading-relaxed text-lg">
              The problem wasn&apos;t the tool. It was the model. You can&apos;t guide a user through a product you don&apos;t understand, in real time, at the moment they&apos;re confused. A static tour doesn&apos;t cut it.
            </p>
            <p className="text-slate-600 leading-relaxed text-lg">
              Existing tools either showed you data <em>or</em> talked to users — none did both. Analytics told you someone dropped off at step 3. Support tickets told you they were confused. But neither told you what the AI said right before they left.
            </p>
            <p className="text-slate-600 leading-relaxed text-lg">
              The free tier exists because the market needed a credible alternative to enterprise tools with &ldquo;Contact Sales&rdquo; pricing. Real features, not a crippled trial.
            </p>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 bg-bg-light border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-black text-slate-900 mb-10">The team</h2>
          <div className="flex gap-8">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center text-white text-3xl font-black flex-shrink-0">P</div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Prism Team</h3>
              <p className="text-brand text-sm font-medium mt-0.5">Founder</p>
              <p className="text-slate-500 mt-3 leading-relaxed">
                {/* TODO: Replace with real founder bio */}
                Building the AI onboarding layer for SaaS. Previously shipped at [company]. Obsessed with activation rates and why users get stuck.
              </p>
              <Link href="https://twitter.com/useprism" target="_blank" className="flex items-center gap-2 text-brand text-sm font-medium mt-4 hover:text-brand-dark transition-colors">
                <XIcon className="w-4 h-4" /> @useprism
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Hiring */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-4">We&apos;re hiring</h2>
          <p className="text-slate-500 text-lg mb-6">Building something hard? We&apos;d love to talk.</p>
          <Link href="mailto:hello@useprism.ai" className="inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-dark transition-colors text-lg">
            <Mail className="w-5 h-5" /> hello@useprism.ai
          </Link>
        </div>
      </section>
    </div>
  );
}
