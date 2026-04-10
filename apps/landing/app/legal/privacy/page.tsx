import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Privacy Policy — OnboardAI',
  description: 'How OnboardAI collects, uses, and protects your data.',
};

const EFFECTIVE_DATE = 'April 9, 2026';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm mb-12">Effective date: {EFFECTIVE_DATE}</p>

          <div className="prose prose-invert max-w-none space-y-10 text-zinc-400 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Who we are</h2>
              <p>
                OnboardAI (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) provides an AI-powered onboarding intelligence platform for SaaS products.
                Our service includes a JavaScript widget, a REST API, and a web dashboard (collectively, the &quot;Service&quot;).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. Data we collect</h2>
              <h3 className="text-base font-semibold text-zinc-300 mb-2">2a. Data you provide</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Account information: name, email address, password (hashed with bcrypt)</li>
                <li>Organization name and billing details (processed by Stripe — we never see raw card numbers)</li>
                <li>Flow configuration: step names, AI prompts, completion events</li>
                <li>Integration credentials: API keys for Segment, Mixpanel, HubSpot, or Webhook URLs (stored encrypted)</li>
              </ul>
              <h3 className="text-base font-semibold text-zinc-300 mb-2 mt-4">2b. Data collected via the widget</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>The <code className="text-indigo-400 text-xs bg-indigo-500/10 px-1 rounded font-mono">userId</code> you pass to <code className="text-indigo-400 text-xs bg-indigo-500/10 px-1 rounded font-mono">OnboardAI('init', ...)</code></li>
                <li>The <code className="text-indigo-400 text-xs bg-indigo-500/10 px-1 rounded font-mono">metadata</code> object you pass (plan, role, etc.) — you control what goes here</li>
                <li>Conversation messages between your users and the AI copilot</li>
                <li>Session events: which steps were completed, timestamps, time spent</li>
                <li>Behavioral signals: last active time, session progress, abandonment status</li>
              </ul>
              <h3 className="text-base font-semibold text-zinc-300 mb-2 mt-4">2c. Technical data</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Server logs: IP address, user-agent, request path, response code (retained 30 days)</li>
                <li>Error traces for debugging (no message content included)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. How we use your data</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>To provide the Service: start sessions, run the AI agent, advance onboarding steps, fire integrations</li>
                <li>To compute analytics: activation funnels, churn scores, benchmark comparisons, optimization suggestions</li>
                <li>To send transactional emails: welcome email on signup, billing receipts (via Resend)</li>
                <li>To improve the Service: aggregate, anonymized usage patterns — never linked back to individual users</li>
                <li>To comply with legal obligations</li>
              </ul>
              <p className="mt-4 text-sm">
                We do not sell your data. We do not use your data or your users&apos; data to train AI models.
                Conversation data is passed to Anthropic&apos;s Claude API solely to generate responses in real time.
                See <a href="https://www.anthropic.com/privacy" className="text-indigo-400 hover:underline" target="_blank" rel="noopener noreferrer">Anthropic&apos;s Privacy Policy</a> for how they handle API requests.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Data sharing</h2>
              <p className="text-sm mb-3">We share data only with the following sub-processors, strictly to operate the Service:</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-zinc-400 font-medium py-2 pr-6">Sub-processor</th>
                      <th className="text-left text-zinc-400 font-medium py-2 pr-6">Purpose</th>
                      <th className="text-left text-zinc-400 font-medium py-2">Location</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-500">
                    <tr className="border-b border-white/5"><td className="py-2 pr-6">Anthropic</td><td className="py-2 pr-6">AI inference (Claude API)</td><td className="py-2">USA</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-6">Supabase</td><td className="py-2 pr-6">PostgreSQL database hosting</td><td className="py-2">USA / EU</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-6">Railway</td><td className="py-2 pr-6">Backend compute hosting</td><td className="py-2">USA</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-6">Vercel</td><td className="py-2 pr-6">Dashboard + landing hosting</td><td className="py-2">Global CDN</td></tr>
                    <tr className="border-b border-white/5"><td className="py-2 pr-6">Stripe</td><td className="py-2 pr-6">Payment processing</td><td className="py-2">USA</td></tr>
                    <tr><td className="py-2 pr-6">Resend</td><td className="py-2 pr-6">Transactional email</td><td className="py-2">USA</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm mt-4">
                Your connected integrations (Segment, Mixpanel, HubSpot, Webhook) are your own sub-processors.
                Data sent to them is governed by your agreements with those services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data retention</h2>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Session and conversation data: retained while your account is active</li>
                <li>Optimization logs: retained for 12 months</li>
                <li>Server logs: 30 days</li>
                <li>After account deletion: all personal data purged within 30 days, aggregate statistics retained anonymously</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Security</h2>
              <p className="text-sm">
                All data is transmitted over HTTPS. Passwords are hashed with bcrypt (10 rounds). Integration credentials
                are stored encrypted at rest. JWT tokens expire after 7 days. We use Helmet.js security headers on all API responses.
                We perform no raw storage of card data — Stripe handles all payment information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Your rights</h2>
              <p className="text-sm mb-3">
                Depending on your jurisdiction you may have rights to access, correct, export, or delete your personal data.
                To exercise any of these rights, email us at <a href="mailto:privacy@onboardai.com" className="text-indigo-400 hover:underline">privacy@onboardai.com</a>.
                We will respond within 30 days.
              </p>
              <p className="text-sm">
                If you are operating under GDPR, you are the data controller for your end users&apos; data.
                OnboardAI acts as a data processor. Contact us for a Data Processing Agreement (DPA).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Children</h2>
              <p className="text-sm">
                The Service is not directed at children under 13. We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Changes to this policy</h2>
              <p className="text-sm">
                We may update this policy. Material changes will be emailed to registered account holders at least 14 days before taking effect.
                Continued use of the Service after the effective date constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
              <p className="text-sm">
                Questions? Email <a href="mailto:privacy@onboardai.com" className="text-indigo-400 hover:underline">privacy@onboardai.com</a>.
              </p>
            </section>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
