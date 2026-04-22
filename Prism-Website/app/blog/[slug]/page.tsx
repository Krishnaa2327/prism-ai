import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.243 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const articles: Record<string, {
  title: string; tag: string; date: string; readTime: string;
  author: { name: string; role: string }; content: string;
  related: string[];
}> = {
  "tandem-ai-alternatives": {
    title: "Best Tandem AI alternatives for B2B SaaS in 2026",
    tag: "Comparison",
    date: "April 10, 2026",
    readTime: "8 min read",
    author: { name: "Prism Team", role: "Founder" },
    content: `
## Why teams are looking for Tandem alternatives

Tandem built something interesting — an AI agent that could guide users through SaaS products. But "Contact Sales" pricing and limited customization left many founders looking for alternatives.

## What to look for in an AI onboarding tool

Before comparing options, you need to know what actually matters:

- **Can it execute actions?** — Not just talk, but click buttons, fill forms, navigate pages
- **Does it show you failures?** — Which users got stuck and why
- **Self-healing selectors** — Does it break when you redesign your UI?
- **Transparent pricing** — No enterprise lock-in

## The top alternatives

### Prism (this is us — we'll be honest)

Prism started as a Tandem alternative for teams who wanted the same result without "Contact Sales." The key differences:

- Free tier (3 agents, 100 MTU) — no credit card
- Failure Inbox shows you exactly what users said before they left
- 8-strategy self-healing selector resolver
- MCP connectors for calling your APIs mid-onboarding

### Appcues

Good for product tours and checklists. Doesn't execute DOM actions — it can highlight UI but can't click buttons for you.

### Userflow

Strong no-code builder, good analytics. No AI agent layer — users still have to do the work themselves.

### Intercom Product Tours

Better if you're already on Intercom. Limited action execution, more focused on tooltips.

## Bottom line

If you need an agent that *does things* (not just explains them), Prism or a custom implementation is your only real option. If you need enterprise sign-off and don't care about pricing, Tandem and Appcues are solid.
    `,
    related: ["in-app-ai-agent-build-vs-buy", "what-is-ai-onboarding-agent"],
  },
  "in-app-ai-agent-build-vs-buy": {
    title: "In-app AI agent for SaaS onboarding: build vs. buy in 2026",
    tag: "Guide",
    date: "April 7, 2026",
    readTime: "6 min read",
    author: { name: "Prism Team", role: "Founder" },
    content: `
## The build temptation

Every engineer's first instinct is to build it. "How hard can it be?" Here's the real list of what you'd need to build from scratch to match a production AI onboarding agent...

## What "build" actually involves

- DOM traversal and selector engine (with 8+ fallback strategies for when selectors break after redesigns)
- LLM integration with streaming, context management, token budgeting
- Action execution loop with post-action verification
- Session state and resumability across page loads
- Failure detection and inbox UI
- A flow builder your non-technical team can use

Conservatively, a senior engineer takes 3–6 months to get to feature parity with a production tool.

## The hidden costs

The math changes when you count ongoing maintenance. Every time you redesign a UI component, you'll need to update selectors. Every time your LLM provider updates their API, something breaks.

## When to build

- You're a dev tool with very specific DOM needs
- You need deep integration with proprietary internal systems
- You have compliance requirements that prevent external data processing

## When to buy (most cases)

- You're a SaaS product focused on your core feature, not onboarding infrastructure
- You want results in days, not months
- You can't afford a 3-month eng sprint on infrastructure

## The verdict

Buy unless you're at Series B+ with dedicated platform engineering resources. Even then, the ROI of building is usually negative.
    `,
    related: ["tandem-ai-alternatives", "why-users-never-finish-onboarding"],
  },
  "why-users-never-finish-onboarding": {
    title: "Why 60% of SaaS users never finish onboarding (and what to do about it)",
    tag: "Guide",
    date: "March 30, 2026",
    readTime: "7 min read",
    author: { name: "Prism Team", role: "Founder" },
    content: `
## The data is worse than you think

The average SaaS product loses 40–60% of new users before they complete onboarding. Most founders know this abstractly but don't feel the pain until they stare at their own funnel.

Here's what the research shows: 40–60% of users who sign up for a free trial never return after day one. Of those who do return, a large portion drop during the first week. By the time you're looking at your monthly cohort, the onboarding cliff is already baked into your numbers.

## Why does it happen?

There are four root causes behind almost every onboarding failure:

### 1. The UI isn't what the user expected

Users sign up based on a landing page, a demo, or a referral. The moment they see the actual product UI, their mental model breaks. "Where's the thing I came here for?" If your product is complex, this is almost guaranteed.

### 2. The first value moment requires too many steps

Your "aha moment" — the point where users get real value — is behind too many setup steps. Every step you add reduces completion rate. A 6-step flow has roughly 64% of the completion rate of a 4-step flow, assuming equal friction per step.

### 3. You don't help at the right moment

Most products have one chance to help: the generic modal tooltip sequence on login. By the time a user hits a real blocker three steps in, the tooltips are gone and there's nothing to help them.

### 4. You can't see where they stopped

Without session replay with conversation context, you know a user dropped off at "Step 3" but you have no idea *why*. They didn't fill in a form field? They didn't understand a concept? They couldn't find a button? These require completely different fixes.

## What actually moves the needle

### Fix 1: Shrink the path to value

Audit every step in your onboarding. Ask: "Does removing this step meaningfully reduce the user's chance of activation?" If not, cut it. Import with CSV instead of manual entry. Skip optional fields. Defer decisions that don't affect day-one value.

### Fix 2: Add active guidance at the point of friction

Passive onboarding (tooltips, docs links) works for motivated users. For everyone else, you need active guidance — something that responds to confusion and takes action. An AI agent that can say "let me click that for you" eliminates friction that no amount of good UX can fully solve.

### Fix 3: Watch your failures, not just your completions

Your completion funnel tells you *where* users drop. Session replay with conversation context tells you *why*. The combination is the difference between "users drop at step 3" and "users drop at step 3 because they can't find the Settings menu — which we moved in the last redesign."

## The bottom line

You can't fix what you can't see, and you can't help users at the right moment without tools that follow them through the flow. The companies turning onboarding from a leaky funnel into a predictable activation machine are the ones doing both.
    `,
    related: ["measure-activation-rate"],
  },
  "measure-activation-rate": {
    title: "How to measure activation rate: the only metric that predicts retention",
    tag: "Guide",
    date: "March 24, 2026",
    readTime: "5 min read",
    author: { name: "Prism Team", role: "Founder" },
    content: `
## What is activation rate?

Activation rate is the percentage of new signups who reach your "aha moment" — the point where they first experience the core value of your product. It's the single metric that most strongly predicts whether a user will stick around.

If you have a 15% activation rate, 85 out of every 100 signups leave before they get value. No retention strategy compensates for that.

## How to define your activation event

The most common mistake teams make: confusing activity with activation. Logging in is not activation. Creating an account is not activation. Activation is the specific action that correlates with retention.

To find yours:

- Pull your retained users (active after day 30)
- Pull your churned users (never active after day 7)
- Compare what actions the retained group took in the first 48 hours that the churned group didn't

For most SaaS products, the activation event looks like: "connected an integration", "sent first message", "created first report", "invited a teammate".

## How to calculate it

Activation Rate = (Users who hit aha moment ÷ Total signups) × 100

Measure this over a cohort window, not as a rolling average. A weekly cohort analysis tells you: of everyone who signed up in week X, what percentage activated?

## What's a good activation rate?

- Below 20%: critical, needs immediate attention
- 20–40%: typical for complex B2B products
- 40–60%: strong — most growth-stage companies aim here
- 60%+: excellent — usually means you've nailed your first-run experience

## How to improve it

- Shorten the path to the activation event — fewer setup steps
- Add guided assistance for the hardest setup step (often an integration or data connection)
- Use session replay to find where users drop before activating
- A/B test empty states, onboarding copy, and setup step order

A 1% improvement in activation rate at 1,000 signups/month means 10 extra activated users. At a $500 LTV, that's $5,000/month in recovered revenue — every single month going forward.
    `,
    related: ["why-users-never-finish-onboarding"],
  },
  "what-is-ai-onboarding-agent": {
    title: "What is an AI onboarding agent? (And why it's different from a chatbot)",
    tag: "Guide",
    date: "March 18, 2026",
    readTime: "4 min read",
    author: { name: "Prism Team", role: "Founder" },
    content: `
## The chatbot vs. agent distinction

A chatbot answers questions. An AI onboarding agent takes actions. This distinction sounds subtle but changes everything about how users experience onboarding.

When a user says "I can't find the settings menu" to a chatbot, it responds: "You can find Settings by clicking the gear icon in the top-right corner."

When an AI onboarding agent hears the same thing, it navigates to the settings menu for them.

## What agents can do that chatbots can't

### DOM interaction

AI onboarding agents can interact with your product's interface directly. They can highlight UI elements, scroll to the right section, fill in form fields, and click buttons — all in the user's live browser. The user watches their product do the thing, instead of reading instructions about how to do it.

### Step-level awareness

An agent knows exactly which onboarding step a user is on, what they've completed, and what's next. It doesn't just answer questions in isolation — it maintains context across an entire onboarding flow.

### Post-action verification

After the agent takes an action, it verifies the outcome. Did the form actually submit? Did the integration connect? If something fails, it has fallback strategies — it doesn't just give up.

### API calls during onboarding

With MCP connectors, agents can call your internal APIs mid-onboarding. Verify a user's integration is live. Create a starter resource on their behalf. Check that their data source connected successfully. Things a chatbot simply cannot do.

## Who benefits most from AI onboarding agents?

- Products with complex, multi-step setup (integrations, data connections, configuration)
- Products where users are non-technical but the setup requires technical steps
- Products where a human CS rep currently has to walk users through setup on Zoom calls

## The tradeoff

Agents are more powerful than chatbots and require more setup. You need to define your flows, configure your prompts, and test your actions. The payoff: dramatically higher activation rates and fewer human escalations.
    `,
    related: ["in-app-ai-agent-build-vs-buy"],
  },
};

export async function generateStaticParams() {
  return Object.keys(articles).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  return {
    title: article ? article.title : "Blog — Prism",
    description: article ? `${article.tag} — Prism Blog` : "",
  };
}

export default async function BlogArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) return <div className="pt-32 text-center text-slate-400">Article not found.</div>;

  return (
    <div className="pt-16">
      {/* Hero */}
      <div className="h-72 bg-gradient-to-br from-[#0a0a0f] via-[#1a1a2e] to-[#4f46e5] relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 h-full flex flex-col justify-end pb-10">
          <Link href="/blog" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Blog
          </Link>
          <span className="inline-block px-3 py-1 bg-brand/20 border border-brand/30 text-brand-light text-xs font-bold rounded-full mb-3 w-fit">{article.tag}</span>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight">{article.title}</h1>
          <div className="flex items-center gap-3 text-slate-400 text-sm mt-4">
            <span>{article.author.name}</span>
            <span>·</span>
            <span>{article.date}</span>
            <span>·</span>
            <span>{article.readTime}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="prose prose-slate max-w-none prose-headings:font-black prose-h2:text-2xl prose-h2:mt-10 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600">
          {article.content.split("\n").filter(Boolean).map((line, i) => {
            if (line.startsWith("## ")) return <h2 key={i} className="text-2xl font-black text-slate-900 mt-10 mb-4">{line.slice(3)}</h2>;
            if (line.startsWith("### ")) return <h3 key={i} className="text-xl font-bold text-slate-900 mt-8 mb-3">{line.slice(4)}</h3>;
            if (line.startsWith("- **")) {
              const [bold, rest] = line.slice(2).split("** — ");
              return <li key={i} className="text-slate-600 mb-1 ml-4"><strong>{bold.replace("**", "")}</strong> — {rest}</li>;
            }
            if (line.startsWith("- ")) return <li key={i} className="text-slate-600 mb-1 ml-4">{line.slice(2)}</li>;
            return <p key={i} className="text-slate-600 leading-relaxed mb-4">{line}</p>;
          })}
        </div>

        {/* Share */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700">Share this article</span>
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand transition-colors">
            <XIcon className="w-4 h-4" /> Twitter / X
          </button>
        </div>

        {/* CTA */}
        <div className="mt-12 p-8 bg-gradient-to-br from-brand/5 to-purple-50 border border-brand/20 rounded-2xl text-center">
          <h3 className="text-2xl font-black text-slate-900 mb-2">Ready to try Prism?</h3>
          <p className="text-slate-500 mb-6">Free forever, no credit card required.</p>
          <Link href="https://app.useprism.ai/register" className="inline-flex items-center gap-2 px-6 py-3 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors shadow-brand-sm">
            Start for free →
          </Link>
        </div>
      </div>
    </div>
  );
}
