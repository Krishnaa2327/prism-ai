'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, BillingStatus } from '@/lib/api';

function UsageBar({ label, used, limit, warnAt = 0.9 }: {
  label: string;
  used: number;
  limit: number;
  warnAt?: number;
}) {
  const unlimited = limit === 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const hot = !unlimited && pct >= warnAt * 100;
  const warm = !unlimited && pct >= 0.7 * 100;

  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>{label}</span>
        <span>
          <span className={hot ? 'text-red-600 font-semibold' : 'font-medium text-slate-700'}>
            {used.toLocaleString()}
          </span>
          {' / '}
          {unlimited ? '∞' : limit.toLocaleString()}
        </span>
      </div>
      {!unlimited && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              hot ? 'bg-red-500' : warm ? 'bg-amber-400' : 'bg-brand-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {hot && (
        <p className="text-xs text-red-500 mt-1.5">
          You're nearly at your {label.toLowerCase()} limit. Upgrade to keep your widget running.
        </p>
      )}
    </div>
  );
}

function BillingPageInner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    api.billing.status().then(setStatus).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (priceId: string, planKey: string) => {
    setActionLoading(planKey);
    try {
      const { url } = await api.billing.checkout(priceId);
      if (url) window.location.href = url;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to start checkout');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading('portal');
    try {
      const { url } = await api.billing.portal();
      if (url) window.location.href = url;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to open billing portal');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your plan and usage.</p>
      </div>

      {searchParams.get('success') && (
        <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          ✓ Payment successful — your plan has been upgraded!
        </div>
      )}
      {searchParams.get('canceled') && (
        <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
          Checkout was canceled. No charges were made.
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-32 bg-slate-200 rounded-xl" />
          <div className="h-64 bg-slate-200 rounded-xl" />
        </div>
      ) : status ? (
        <div className="space-y-5">

          {/* Current plan header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-700">Current plan</h2>
                <p className="text-2xl font-bold text-slate-900 mt-0.5">
                  {status.planName}
                  {status.price > 0 && (
                    <span className="text-base font-normal text-slate-500 ml-2">${status.price}/mo</span>
                  )}
                </p>
                {status.subscriptionStatus === 'active' && status.currentPeriodEnd && (
                  <p className="text-xs text-slate-400 mt-1">
                    Renews {new Date(status.currentPeriodEnd).toLocaleDateString('en-US', {
                      month: 'long', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                )}
                {status.subscriptionStatus === 'past_due' && (
                  <p className="text-xs text-red-500 mt-1 font-medium">
                    ⚠ Payment past due — update your payment method
                  </p>
                )}
              </div>

              {status.hasStripeCustomer && (
                <button
                  onClick={handlePortal}
                  disabled={actionLoading === 'portal'}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {actionLoading === 'portal' ? 'Opening…' : 'Manage subscription'}
                </button>
              )}
            </div>

            {/* Usage bars */}
            <div className="space-y-4">
              <UsageBar
                label="Monthly Tracked Users (MTU)"
                used={status.mtuUsed}
                limit={status.mtuLimit}
              />
              <UsageBar
                label="AI agents"
                used={status.agentsUsed}
                limit={status.agentLimit}
              />
              <UsageBar
                label="Messages this month"
                used={status.messagesUsedThisMonth}
                limit={status.monthlyMessageLimit}
              />
            </div>
          </div>

          {/* What's included in your plan */}
          {status.features && status.features.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                What&apos;s included in your plan
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                {status.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-emerald-500 font-bold flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Plan cards */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Available plans</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {status.plans.map((plan) => {
                const isCurrent = plan.current;
                const priceIds: Record<string, string> = {
                  starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? '',
                  growth:  process.env.NEXT_PUBLIC_STRIPE_PRICE_GROWTH ?? '',
                  scale:   process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE ?? '',
                };
                const priceId = priceIds[plan.key];
                const isLoading = actionLoading === plan.key;

                return (
                  <div
                    key={plan.key}
                    className={`rounded-xl border p-4 flex flex-col ${
                      isCurrent
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-800">{plan.name}</span>
                      {isCurrent && (
                        <span className="text-xs font-medium text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>

                    <p className="text-2xl font-bold text-slate-900 mb-1">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      {plan.price > 0 && <span className="text-sm font-normal text-slate-400">/mo</span>}
                    </p>

                    <div className="text-xs text-slate-500 mb-4 space-y-0.5">
                      <p>{plan.agentLimit === 0 ? 'Unlimited agents' : `${plan.agentLimit} agents`}</p>
                      <p>{plan.mtuLimit === 0 ? 'Unlimited MTU' : `${plan.mtuLimit.toLocaleString()} MTU`}</p>
                      <p>
                        {plan.limit >= 999_999
                          ? 'Unlimited messages'
                          : `${plan.limit.toLocaleString()} messages/mo`}
                      </p>
                    </div>

                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-1 mb-4">
                        {plan.features.slice(0, 5).map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                            <span className="text-emerald-500 font-bold mt-px flex-shrink-0">✓</span>
                            {f}
                          </li>
                        ))}
                        {plan.features.length > 5 && (
                          <li className="text-xs text-slate-400 pl-4">
                            +{plan.features.length - 5} more
                          </li>
                        )}
                      </ul>
                    )}

                    {!isCurrent && plan.key !== 'free' && priceId && (
                      <button
                        onClick={() => handleUpgrade(priceId, plan.key)}
                        disabled={isLoading || !!actionLoading}
                        className="mt-auto w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                      </button>
                    )}

                    {!isCurrent && plan.key !== 'free' && !priceId && (
                      <p className="mt-auto text-xs text-slate-400 text-center">
                        Configure STRIPE_PRICE_{plan.key.toUpperCase()} in .env
                      </p>
                    )}

                    {isCurrent && plan.key !== 'free' && (
                      <button
                        onClick={handlePortal}
                        disabled={!!actionLoading}
                        className="mt-auto w-full py-2 border border-slate-300 text-slate-600 rounded-lg text-sm hover:bg-white transition-colors disabled:opacity-50"
                      >
                        Manage
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      ) : (
        <p className="text-slate-400 text-sm">Failed to load billing information.</p>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}
