// Replace with real quotes after beta launch

const QUOTES = [
  {
    quote:
      "We were losing 60% of users before they connected their first data source. OnboardAI's AI copilot guided them through it — our activation rate went from 28% to 51% in two weeks.",
    name: 'Priya M.',
    role: 'Founder, DataNest Analytics',
    avatar: 'P',
  },
  {
    quote:
      "Our no-code tool has a steep learning curve. OnboardAI configured a 4-step flow and now new users build their first automation without ever reading the docs. It literally does the setup for them.",
    name: 'Arjun T.',
    role: 'CTO, Flowbuilder',
    avatar: 'A',
  },
  {
    quote:
      "The activation funnel view is what sold me. I could see exactly which step was killing us — step 2 had 44% drop-off. We fixed the AI prompt and drop-off went to 12% in a week.",
    name: 'Sarah K.',
    role: 'Head of Growth, Stackify',
    avatar: 'S',
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white/2 border-y border-white/5">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What early customers are saying
          </h2>
          <p className="text-zinc-400">Beta customers — real results, no cherry-picking.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {QUOTES.map((q) => (
            <div key={q.name} className="rounded-2xl border border-white/10 bg-white/3 p-6">
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-6">"{q.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-brand-500/30 flex items-center justify-center text-brand-300 font-semibold text-sm">
                  {q.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{q.name}</div>
                  <div className="text-xs text-zinc-500">{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
