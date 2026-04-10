const CASES = [
  {
    icon: '📊',
    category: 'Analytics SaaS',
    flow: ['Connect data source', 'Create first dashboard', 'See first insight'],
    result: 'Users reach their first chart in under 8 minutes instead of giving up.',
  },
  {
    icon: '⚡',
    category: 'No-code / Automation',
    flow: ['Build first automation', 'Connect first app', 'Run first workflow'],
    result: 'Users complete their first Zap-equivalent without reading the docs.',
  },
  {
    icon: '🗂️',
    category: 'Project Management',
    flow: ['Create first project', 'Invite first teammate', 'Complete first task'],
    result: 'Teams reach collaborative momentum in a single session.',
  },
  {
    icon: '💰',
    category: 'CRM',
    flow: ['Import contacts', 'Log first deal', 'Set first follow-up'],
    result: 'Sales reps get to their pipeline view without IT help.',
  },
  {
    icon: '🛠️',
    category: 'Developer Tools',
    flow: ['Install SDK', 'Send first API call', 'See response in dashboard'],
    result: 'Developers go from signup to working integration in one sitting.',
  },
  {
    icon: '🎓',
    category: 'EdTech / LMS',
    flow: ['Upload first course', 'Enroll first student', 'View first completion'],
    result: 'Instructors publish their first course without abandoning setup.',
  },
];

export default function UseCases() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Works for{' '}
            <span className="gradient-text">any B2B SaaS</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            You define the steps. The AI executes them. The product category does not matter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CASES.map((c) => (
            <div
              key={c.category}
              className="rounded-2xl border border-white/10 bg-white/3 p-6 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.icon}</span>
                <span className="text-sm font-semibold text-zinc-300">{c.category}</span>
              </div>

              {/* Flow steps */}
              <div className="space-y-2">
                {c.flow.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-full bg-brand-500/20 text-brand-400 text-xs flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-400">{step}</span>
                  </div>
                ))}
              </div>

              {/* Result */}
              <p className="text-xs text-zinc-500 border-t border-white/5 pt-3 leading-relaxed">
                {c.result}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-zinc-600 text-sm mt-10">
          Not seeing your category?{' '}
          <a href="mailto:hello@onboardai.com" className="text-brand-400 hover:underline">
            Tell us what you're building.
          </a>
        </p>
      </div>
    </section>
  );
}
