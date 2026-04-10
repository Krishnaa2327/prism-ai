'use client';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Try it on your staging environment. No card required.',
    limit: '100 guided sessions / mo',
    features: [
      '100 AI-guided onboarding sessions',
      'Up to 3 onboarding steps',
      'Activation funnel analytics',
      'Community support',
    ],
    cta: 'Start free',
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$99',
    period: 'per month',
    description: 'For early-stage SaaS getting to first 100 activated users.',
    limit: '1,000 sessions / mo',
    features: [
      '1,000 AI-guided sessions per month',
      'Unlimited onboarding steps',
      'Custom AI instructions per step',
      'Page actions (fill, click, navigate)',
      'Email support',
    ],
    cta: 'Start Starter',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$299',
    period: 'per month',
    description: 'For scaling SaaS optimising time-to-first-value.',
    limit: '10,000 sessions / mo',
    features: [
      '10,000 AI-guided sessions per month',
      'Everything in Starter',
      'Time-to-value analytics',
      'AI-assist rate per step',
      'Priority support',
    ],
    cta: 'Start Growth',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$999',
    period: 'per month',
    description: 'For funded startups and growth-stage products.',
    limit: 'Unlimited sessions',
    features: [
      'Unlimited sessions',
      'Everything in Growth',
      'White-glove flow setup',
      'SLA + dedicated Slack channel',
      'Custom contract / invoicing',
    ],
    cta: 'Contact us',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, usage-based{' '}
            <span className="gradient-text">pricing</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Pay per guided session. Upgrade or downgrade any time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-brand-500 bg-brand-500/10 glow'
                  : 'border-white/10 bg-white/3'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-500 text-sm">/{plan.period}</span>
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="mb-6 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300">
                {plan.limit}
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="h-4 w-4 text-brand-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={
                  plan.name === 'Contact us'
                    ? 'mailto:hello@onboardai.com'
                    : (process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000/register')
                }
                className={`block w-full rounded-xl py-2.5 text-sm font-semibold text-center transition-colors ${
                  plan.highlight
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-zinc-600 text-sm mt-10">
          All plans include a 14-day money-back guarantee.{' '}
          <a href="mailto:hello@onboardai.com" className="text-brand-400 hover:underline">
            Need a custom plan? Get in touch.
          </a>
        </p>
      </div>
    </section>
  );
}
