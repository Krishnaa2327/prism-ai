// Placeholder logos — replace with real customer logos after beta launch
const LOGOS = [
  'Acme Corp',
  'Nexus HQ',
  'Flowdesk',
  'Lumenr',
  'Stackify',
  'Orbitron',
];

export default function LogoBar() {
  return (
    <section className="py-12 border-y border-white/5 bg-white/2">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-zinc-600 mb-8 uppercase tracking-widest">
          Trusted by fast-growing SaaS teams
        </p>
        <div className="flex flex-wrap justify-center gap-10 items-center">
          {LOGOS.map((name) => (
            <span
              key={name}
              className="text-zinc-600 font-semibold text-lg tracking-tight hover:text-zinc-400 transition-colors"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
