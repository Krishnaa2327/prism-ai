import Link from 'next/link';

const snippet = `<script src="https://cdn.onboardai.com/widget.js"></script>
<script>
  OnboardAI('init', {
    apiKey: 'org_YOUR_KEY',
    userId: currentUser.id,
  });
</script>`;

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-brand-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-4xl text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-100 mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
          AI-powered — works for any B2B SaaS
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6">
          Get every user to their{' '}
          <span className="gradient-text">first value moment</span>
        </h1>

        {/* Sub */}
        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          OnboardAI is an AI copilot embedded in your SaaS product. It detects what each user
          is trying to do, asks one smart question, and guides them through setup — automatically.
          From signup to aha moment, without you lifting a finger.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <a
            href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000/register'}
            className="rounded-xl bg-brand-500 px-8 py-3.5 text-base font-semibold text-white hover:bg-brand-600 transition-colors glow"
          >
            Start free — no credit card
          </a>
          <a
            href="#how-it-works"
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-colors"
          >
            See how it works
          </a>
        </div>

        {/* Code snippet */}
        <div className="code-block text-left p-6 text-sm leading-relaxed">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <div className="h-3 w-3 rounded-full bg-red-500/60" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
            <div className="h-3 w-3 rounded-full bg-green-500/60" />
            <span className="ml-2 text-xs text-zinc-500">Two lines. That's the entire integration.</span>
          </div>
          <pre className="text-zinc-300 overflow-x-auto whitespace-pre-wrap">
            <code>{snippet}</code>
          </pre>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-8 border-t border-white/10 pt-10">
          {[
            { value: '2 min', label: 'average time to integrate' },
            { value: '3 steps', label: 'average flow to first value' },
            { value: '<15KB', label: 'widget bundle, zero dependencies' },
          ].map((stat) => (
            <div key={stat.value} className="text-center">
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-sm text-zinc-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
