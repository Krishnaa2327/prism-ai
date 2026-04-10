/**
 * Churn risk scoring — Phase 4
 *
 * Computes a 0–100 churn risk score for an active onboarding session
 * using behavioral signals from the intelligence pipeline.
 *
 * No ML model needed at this scale — rule-based heuristics with clear weights.
 */

export interface ChurnSignals {
  hoursSinceLastActive: number;
  sessionAgeHours: number;
  progressFraction: number; // 0–1
  status: string;
  stepsCompleted: number;
  totalSteps: number;
}

export interface ChurnScore {
  score: number;                // 0–100
  risk: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendation: string;
}

export function scoreChurnRisk(signals: ChurnSignals): ChurnScore {
  let score = 0;
  const factors: string[] = [];

  const { hoursSinceLastActive, sessionAgeHours, progressFraction, status } = signals;

  // ── Factor 1: Time since last activity (0–40 pts) ────────────────────────
  if (hoursSinceLastActive > 168) {
    score += 40;
    factors.push('Inactive for 7+ days');
  } else if (hoursSinceLastActive > 72) {
    score += 28;
    factors.push('Inactive for 3+ days');
  } else if (hoursSinceLastActive > 24) {
    score += 15;
    factors.push('Inactive for 24+ hours');
  } else if (hoursSinceLastActive > 8) {
    score += 5;
  }

  // ── Factor 2: Onboarding progress (±25 pts) ───────────────────────────────
  if (progressFraction === 0) {
    score += 25;
    factors.push('No steps completed');
  } else if (progressFraction < 0.25) {
    score += 18;
    factors.push('Less than 25% complete');
  } else if (progressFraction < 0.5) {
    score += 8;
    factors.push('Less than halfway through');
  } else if (progressFraction > 0.85) {
    score -= 15; // nearly done — much lower churn risk
  } else if (progressFraction > 0.65) {
    score -= 8;
  }

  // ── Factor 3: Session staleness — age vs progress (0–20 pts) ─────────────
  if (sessionAgeHours > 336 && progressFraction < 0.5) {
    // 2+ weeks old, less than half done
    score += 20;
    factors.push('Session is 2+ weeks old with low progress');
  } else if (sessionAgeHours > 168 && progressFraction < 0.3) {
    score += 12;
    factors.push('Session is 1+ week old with minimal progress');
  } else if (sessionAgeHours > 72 && progressFraction === 0) {
    score += 8;
    factors.push('3+ days since signup with no progress');
  }

  // ── Factor 4: Explicit abandonment ───────────────────────────────────────
  if (status === 'abandoned') {
    score += 25;
    factors.push('Session explicitly abandoned');
  }

  const bounded = Math.min(Math.max(Math.round(score), 0), 100);

  const risk: ChurnScore['risk'] =
    bounded >= 75 ? 'critical'
    : bounded >= 50 ? 'high'
    : bounded >= 25 ? 'medium'
    : 'low';

  const recommendation =
    risk === 'critical' ? 'Send personalized re-engagement — offer a 1:1 onboarding call or direct Slack message'
    : risk === 'high' ? 'Trigger an automated follow-up sequence (email + in-app)'
    : risk === 'medium' ? 'Send a helpful nudge: "Pick up where you left off"'
    : 'No action needed — user is progressing normally';

  return { score: bounded, risk, factors, recommendation };
}

export function buildSignals(session: {
  lastActiveAt: Date;
  startedAt: Date;
  status: string;
  stepProgress: Array<{ status: string }>;
  flow: { steps: Array<{ id: string }> };
}): ChurnSignals {
  const now = Date.now();
  const hoursSinceLastActive = (now - session.lastActiveAt.getTime()) / 3_600_000;
  const sessionAgeHours = (now - session.startedAt.getTime()) / 3_600_000;
  const stepsCompleted = session.stepProgress.filter((p) => p.status === 'completed').length;
  const totalSteps = session.flow.steps.length;
  const progressFraction = totalSteps > 0 ? stepsCompleted / totalSteps : 0;

  return {
    hoursSinceLastActive,
    sessionAgeHours,
    progressFraction,
    status: session.status,
    stepsCompleted,
    totalSteps,
  };
}
