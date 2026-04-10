import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms of Service — OnboardAI',
  description: 'Terms and conditions for using OnboardAI.',
};

const EFFECTIVE_DATE = 'April 9, 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-zinc-500 text-sm mb-12">Effective date: {EFFECTIVE_DATE}</p>

          <div className="space-y-10 text-zinc-400 leading-relaxed">

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Acceptance</h2>
              <p className="text-sm">
                By creating an account or using the OnboardAI Service (the &quot;Service&quot;), you agree to these Terms of Service
                (&quot;Terms&quot;). If you are using the Service on behalf of an organization, you represent that you have authority
                to bind that organization to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. The Service</h2>
              <p className="text-sm">
                OnboardAI provides an AI-powered onboarding intelligence platform. The Service includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm mt-3">
                <li>A JavaScript widget that embeds an AI copilot in your product</li>
                <li>A REST API for session management, event tracking, and analytics</li>
                <li>A web dashboard for flow configuration, activation analytics, and optimization tools</li>
                <li>Integrations with third-party analytics and CRM platforms</li>
              </ul>
              <p className="text-sm mt-3">
                We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Accounts and API keys</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>You are responsible for maintaining the confidentiality of your account password and API keys.</li>
                <li>You are responsible for all activity that occurs under your account or API key.</li>
                <li>You must notify us immediately at <a href="mailto:security@onboardai.com" className="text-indigo-400 hover:underline">security@onboardai.com</a> if you suspect unauthorized access.</li>
                <li>You may not share API keys across multiple organizations without explicit written permission.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Plans and payment</h2>
              <p className="text-sm mb-3">
                The Service is offered on a subscription basis. Pricing is listed at <a href="/pricing" className="text-indigo-400 hover:underline">/pricing</a> and in the dashboard.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Subscriptions are billed monthly or annually in advance via Stripe.</li>
                <li>All fees are non-refundable except where required by law or at our sole discretion.</li>
                <li>We may change pricing with 30 days&apos; written notice. Price changes take effect at your next renewal.</li>
                <li>Overdue invoices may result in service suspension after 7 days.</li>
                <li>The Free plan is provided as-is with no SLA guarantees.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable use</h2>
              <p className="text-sm mb-3">You may not use the Service to:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Violate any applicable law or regulation</li>
                <li>Send spam, phishing, or misleading content to your users</li>
                <li>Manipulate or deceive end users in ways that harm them</li>
                <li>Scrape, reverse engineer, or extract training data from the Service</li>
                <li>Probe, scan, or test the vulnerability of any OnboardAI system</li>
                <li>Exceed rate limits or otherwise abuse the API in ways that degrade the Service for others</li>
                <li>Resell or white-label the Service without a written reseller agreement</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Your data and your users&apos; data</h2>
              <p className="text-sm mb-3">
                You retain ownership of all data you submit to the Service (&quot;Customer Data&quot;), including your flow configurations
                and the data about your end users.
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>You are responsible for having a lawful basis to collect and process your end users&apos; data and for obtaining any required consents.</li>
                <li>You are responsible for your own privacy policy disclosures to your end users.</li>
                <li>You grant OnboardAI a limited license to process Customer Data solely to provide the Service.</li>
                <li>We will not use Customer Data to train AI models or for any purpose beyond operating the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Intellectual property</h2>
              <p className="text-sm">
                The Service, including all software, algorithms, UI, and documentation, is owned by OnboardAI and protected by
                intellectual property laws. These Terms do not grant you any rights to our intellectual property beyond
                the limited right to use the Service as described.
              </p>
              <p className="text-sm mt-3">
                You retain all rights to your flow configurations, AI prompts, and any content you create using the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. AI-generated content</h2>
              <p className="text-sm">
                The Service uses large language models (Claude by Anthropic) to generate responses and optimization suggestions.
                AI-generated content may be inaccurate, incomplete, or inappropriate. You are responsible for reviewing
                AI-generated prompts before applying them to production flows. We make no warranties about the accuracy,
                completeness, or fitness of AI-generated content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Service levels and uptime</h2>
              <p className="text-sm">
                For paid plans (Starter and above), we target 99.5% monthly uptime for the API and dashboard.
                Scheduled maintenance is excluded. In the event of a material breach of uptime, your sole remedy
                is a pro-rated service credit for the affected period. We are not liable for outages caused by
                third-party services (Anthropic API, Supabase, Railway, Stripe, etc.).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Disclaimer of warranties</h2>
              <p className="text-sm">
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED,
                INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                WE DO NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE, UNINTERRUPTED, OR THAT AI-GENERATED CONTENT
                WILL BE ACCURATE OR SUITABLE FOR YOUR PURPOSE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Limitation of liability</h2>
              <p className="text-sm">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, ONBOARDAI WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING
                FROM YOUR USE OF THE SERVICE. OUR TOTAL CUMULATIVE LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM
                THESE TERMS OR THE SERVICE WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE 3 MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">12. Indemnification</h2>
              <p className="text-sm">
                You agree to indemnify and hold harmless OnboardAI and its officers, employees, and contractors from
                any claims, damages, or expenses arising from: (a) your use of the Service; (b) your violation of
                these Terms; (c) your violation of any rights of a third party, including your end users; or
                (d) your end users&apos; data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">13. Termination</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>You may cancel your account at any time from the dashboard. Cancellation takes effect at the end of your current billing period.</li>
                <li>We may suspend or terminate your account immediately for material violations of these Terms, including non-payment or acceptable use violations.</li>
                <li>Upon termination, we will export your Customer Data in a standard format upon request within 30 days. After 30 days, data may be deleted.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">14. Governing law</h2>
              <p className="text-sm">
                These Terms are governed by the laws of India. Any disputes will be resolved in the courts of India.
                If any provision of these Terms is found unenforceable, the remaining provisions remain in full effect.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">15. Changes to these Terms</h2>
              <p className="text-sm">
                We may update these Terms. Material changes will be emailed to registered account holders at least 14 days
                before taking effect. Continued use of the Service after the effective date constitutes acceptance of the
                updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">16. Contact</h2>
              <p className="text-sm">
                Questions about these Terms? Email <a href="mailto:legal@onboardai.com" className="text-indigo-400 hover:underline">legal@onboardai.com</a>.
              </p>
            </section>

          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
