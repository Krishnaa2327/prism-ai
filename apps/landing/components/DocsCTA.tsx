const DOCS = [
  {
    title: 'Quick start',
    description: 'Embed the widget and see your first AI conversation in under 5 minutes.',
    icon: '⚡',
    href: '#quick-start',
  },
  {
    title: 'Widget API reference',
    description: 'All init options, event hooks, and metadata fields — with TypeScript types.',
    icon: '📦',
    href: '#widget-api',
  },
  {
    title: 'Custom AI instructions',
    description: 'Tune the system prompt for your product: tone, scope, escalation rules.',
    icon: '🤖',
    href: '#ai-config',
  },
  {
    title: 'Webhook events',
    description: 'Subscribe to conversation.started, message.sent, and conversion events.',
    icon: '🔔',
    href: '#webhooks',
  },
];

export default function DocsCTA() {
  return (
    <section id="docs" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Everything you need to{' '}
            <span className="gradient-text">ship fast</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Full API docs, TypeScript types, and copy-paste examples.
          </p>
        </div>

        {/* Doc cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {DOCS.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              className="group rounded-2xl border border-white/10 bg-white/3 p-6 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all"
            >
              <div className="text-2xl mb-3">{doc.icon}</div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-brand-300 transition-colors">
                {doc.title}
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{doc.description}</p>
            </a>
          ))}
        </div>

        {/* Big CTA */}
        <div className="rounded-2xl border border-brand-500/30 bg-brand-500/10 p-10 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">Ready to stop the drop-off?</h3>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            100 free conversations per month. No credit card. Cancel any time.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000/register'}
              className="rounded-xl bg-brand-500 px-8 py-3.5 font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              Create free account
            </a>
            <a
              href="mailto:hello@onboardai.com"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Talk to us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
