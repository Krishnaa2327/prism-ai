const STEPS = [
  {
    number: '01',
    title: 'Configure your onboarding flow',
    description:
      'Log into your dashboard and define the steps your users need to complete — "Connect data", "Create first dashboard", "See first insight". Set the AI prompt for each step, add smart questions, configure page actions. Takes 10 minutes.',
    code: `// Example: Analytics SaaS flow
Step 1: "Connect your data source"
  → AI asks: "What's your main data source?"
  → Action: highlight the upload button

Step 2: "Create your first dashboard"
  → AI asks: "What do you want to track?"
  → Action: fill the dashboard name field

Step 3: "Your first insight" (milestone)
  → AI celebrates. User is activated.`,
    color: 'from-purple-500/20 to-brand-500/20',
  },
  {
    number: '02',
    title: 'Embed one script tag',
    description:
      'Copy your API key from the dashboard. Add two lines to your product. The widget loads asynchronously — no impact on page speed, no dependencies, no framework requirements. Works in any SaaS product.',
    code: `<script src="https://cdn.onboardai.com/widget.js"></script>
<script>
  OnboardAI('init', {
    apiKey: 'org_YOUR_KEY',
    userId: currentUser.id,
    metadata: { plan: currentUser.plan }
  });
</script>`,
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    number: '03',
    title: 'AI guides every new user',
    description:
      'When a user signs up, the copilot opens with their current step context. The AI detects what they are trying to do, asks one clarifying question, then acts — fills forms, highlights buttons, navigates pages. Users reach first value without getting stuck.',
    code: `// What the AI does per step:
→ Detects intent from current page
→ Asks: "What's your data source?"
→ User: "CSV"
→ AI highlights upload button
→ User uploads → step auto-completes
→ AI advances to Step 2`,
    color: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    number: '04',
    title: 'Track activation in real time',
    description:
      'Your dashboard shows the full drop-off funnel: how many users started each step, completed it, and how long it took. See which steps the AI helped with and which ones need better configuration. Time-to-first-value is your north star metric.',
    code: `GET /api/v1/activation/funnel
→ {
    funnel: [
      { step: "Connect data",    started: 320, completed: 290, dropOff: 9% },
      { step: "Build dashboard", started: 290, completed: 201, dropOff: 31% },
      { step: "First insight",   started: 201, completed: 198, dropOff: 1%  }
    ],
    avgTimeToValueMins: 7
  }`,
    color: 'from-orange-500/20 to-red-500/20',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            From signup to aha moment in{' '}
            <span className="gradient-text">four steps</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            You configure the flow once. The AI runs it for every user, forever.
          </p>
        </div>

        <div className="space-y-8">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`relative rounded-2xl border border-white/10 overflow-hidden bg-gradient-to-r ${step.color} p-px`}
            >
              <div className="rounded-2xl bg-[#0f0f11] p-8 flex flex-col lg:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <span className="text-5xl font-black text-white/10">{step.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-zinc-400 leading-relaxed mb-4">{step.description}</p>
                  <div className="code-block px-4 py-3 text-sm text-zinc-300 overflow-x-auto">
                    <pre><code>{step.code}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
