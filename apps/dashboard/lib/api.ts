// Fetch wrapper — automatically attaches JWT from localStorage

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('oai_token');
}

interface FetchOptions extends RequestInit {
  auth?: boolean; // default true — attach JWT header
}

async function apiFetch<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { auth = true, ...rest } = opts;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(rest.headers ?? {}),
  };

  if (auth) {
    const token = getToken();
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers });

  if (res.status === 401) {
    // Token expired — clear and redirect to login
    localStorage.removeItem('oai_token');
    localStorage.removeItem('oai_user');
    localStorage.removeItem('oai_org');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch<{ token: string; user: User; organization: Org }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        auth: false,
      }),
    register: (data: { name: string; email: string; password: string; orgName: string }) =>
      apiFetch<{ token: string; user: User; organization: Org }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
        auth: false,
      }),
  },

  conversations: {
    list: (params?: { limit?: number; offset?: number }) => {
      const q = new URLSearchParams({ limit: String(params?.limit ?? 20), offset: String(params?.offset ?? 0) });
      return apiFetch<{ conversations: Conversation[]; total: number; hasMore: boolean }>(`/api/v1/conversations?${q}`);
    },
    get: (id: string) => apiFetch<ConversationDetail>(`/api/v1/conversations/${id}`),
  },

  analytics: {
    overview: () => apiFetch<OverviewStats>('/api/v1/analytics/overview'),
    timeline: (days = 30) => apiFetch<TimelinePoint[]>(`/api/v1/analytics/timeline?days=${days}`),
    triggers: () => apiFetch<TriggerStat[]>('/api/v1/analytics/triggers'),
    intents: (days = 30) => apiFetch<IntentsResponse>(`/api/v1/analytics/intents?days=${days}`),
  },

  config: {
    get: () => apiFetch<OrgConfig>('/api/v1/config'),
    updateAI: (customInstructions: string) =>
      apiFetch<{ updated: boolean }>('/api/v1/config/ai', {
        method: 'PUT',
        body: JSON.stringify({ customInstructions }),
      }),
    rotateKey: () => apiFetch<{ apiKey: string }>('/api/v1/config/rotate-key', { method: 'POST' }),
  },

  onboarding: {
    status: () => apiFetch<OnboardingStatus>('/api/v1/onboarding/status'),
  },

  checklist: {
    list: () => apiFetch<{ steps: ChecklistStep[] }>('/api/v1/checklist/admin'),
    create: (data: Omit<ChecklistStep, 'id' | 'organizationId' | 'createdAt'>) =>
      apiFetch<{ step: ChecklistStep }>('/api/v1/checklist/steps', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Omit<ChecklistStep, 'id' | 'organizationId' | 'createdAt'>>) =>
      apiFetch<{ step: ChecklistStep }>(`/api/v1/checklist/steps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/v1/checklist/steps/${id}`, { method: 'DELETE' }),
  },

  followup: {
    getConfig: () => apiFetch<FollowUpConfig>('/api/v1/followup/config'),
    saveConfig: (data: Partial<FollowUpConfig>) =>
      apiFetch<{ saved: boolean }>('/api/v1/followup/config', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  billing: {
    status: () => apiFetch<BillingStatus>('/api/v1/billing/status'),
    checkout: (priceId: string) =>
      apiFetch<{ url: string }>('/api/v1/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId }),
      }),
    portal: () =>
      apiFetch<{ url: string }>('/api/v1/billing/portal', { method: 'POST' }),
  },

  flow: {
    list: () => apiFetch<{ flows: OnboardingFlow[] }>('/api/v1/flow'),
    get: (id: string) => apiFetch<{ flow: OnboardingFlow }>(`/api/v1/flow/${id}`),
    listTemplates: () => apiFetch<{ templates: FlowTemplateMeta[] }>('/api/v1/flow/templates'),
    createFromTemplate: (templateId: string) =>
      apiFetch<{ flow: OnboardingFlow }>('/api/v1/flow/from-template', {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      }),
    create: (name: string, description?: string) =>
      apiFetch<{ flow: OnboardingFlow }>('/api/v1/flow', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),
    update: (id: string, data: Partial<Pick<OnboardingFlow, 'name' | 'description' | 'isActive'>>) =>
      apiFetch<{ updated: boolean }>(`/api/v1/flow/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/v1/flow/${id}`, { method: 'DELETE' }),
    createStep: (flowId: string, data: Omit<OnboardingStep, 'id' | 'flowId' | 'createdAt'>) =>
      apiFetch<{ step: OnboardingStep }>(`/api/v1/flow/${flowId}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateStep: (flowId: string, stepId: string, data: Partial<OnboardingStep>) =>
      apiFetch<{ step: OnboardingStep }>(`/api/v1/flow/${flowId}/steps/${stepId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteStep: (flowId: string, stepId: string) =>
      apiFetch<{ deleted: boolean }>(`/api/v1/flow/${flowId}/steps/${stepId}`, { method: 'DELETE' }),
  },

  churn: {
    atRisk: (minScore?: number) => apiFetch<ChurnAtRiskResponse>(`/api/v1/churn/at-risk${minScore !== undefined ? `?minScore=${minScore}` : ''}`),
    summary: () => apiFetch<ChurnSummary>('/api/v1/churn/summary'),
  },

  autooptimize: {
    getSettings: () => apiFetch<AutoOptimizeSettings>('/api/v1/autooptimize/settings'),
    updateSettings: (data: Partial<Pick<AutoOptimizeSettings, 'enabled' | 'threshold' | 'minSessions'>>) =>
      apiFetch<AutoOptimizeSettings>('/api/v1/autooptimize/settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    run: () => apiFetch<AutoOptimizeRunResult>('/api/v1/autooptimize/run', { method: 'POST' }),
    log: (limit?: number) => apiFetch<{ logs: OptimizationLogEntry[]; total: number }>(`/api/v1/autooptimize/log${limit ? `?limit=${limit}` : ''}`),
  },

  benchmarks: {
    overview: () => apiFetch<BenchmarkOverview>('/api/v1/benchmarks/overview'),
    steps: () => apiFetch<{ flowName: string; steps: BenchmarkStep[] }>('/api/v1/benchmarks/steps'),
  },

  optimize: {
    flow: () => apiFetch<{ flowId: string; flowName: string; steps: OptimizeStep[] }>('/api/v1/optimize/flow'),
    suggest: (stepId: string) => apiFetch<OptimizeSuggestion>(`/api/v1/optimize/suggest/${stepId}`, { method: 'POST' }),
    apply: (stepId: string, prompt: string) =>
      apiFetch<{ applied: boolean; stepId: string }>(`/api/v1/optimize/apply/${stepId}`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
  },

  escalations: {
    list: (status?: string) =>
      apiFetch<{ tickets: EscalationTicket[]; counts: { open: number; in_progress: number; resolved: number } }>(
        `/api/v1/escalations${status ? `?status=${status}` : ''}`
      ),
    get: (id: string) => apiFetch<{ ticket: EscalationTicketDetail }>(`/api/v1/escalations/${id}`),
    update: (id: string, data: { status?: string; notes?: string }) =>
      apiFetch<{ ticket: EscalationTicket }>(`/api/v1/escalations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  users: {
    list: (params?: { limit?: number; offset?: number }) => {
      const q = new URLSearchParams({ limit: String(params?.limit ?? 50), offset: String(params?.offset ?? 0) });
      return apiFetch<{ users: EndUserSummary[]; total: number; hasMore: boolean }>(`/api/v1/users?${q}`);
    },
    history: (userId: string) => apiFetch<UserHistoryDetail>(`/api/v1/users/${userId}/history`),
  },

  flowHealth: {
    list: () => apiFetch<FlowHealthResponse>('/api/v1/flow/health'),
  },

  experiments: {
    list: () => apiFetch<{ experiments: FlowExperiment[] }>('/api/v1/experiments'),
    create: (data: { name: string; controlFlowId: string; variantFlowId: string; trafficSplit: number }) =>
      apiFetch<{ experiment: FlowExperiment }>('/api/v1/experiments', {
        method: 'POST', body: JSON.stringify(data),
      }),
    results: (id: string) => apiFetch<ExperimentResults>(`/api/v1/experiments/${id}/results`),
    update: (id: string, data: { status?: string; winnerId?: string | null }) =>
      apiFetch<{ experiment: FlowExperiment }>(`/api/v1/experiments/${id}`, {
        method: 'PUT', body: JSON.stringify(data),
      }),
  },

  alertConfig: {
    get: () => apiFetch<AlertConfig>('/api/v1/config/alerts'),
    update: (data: Partial<AlertConfig>) =>
      apiFetch<{ saved: boolean }>('/api/v1/config/alerts', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  },

  kb: {
    list: () => apiFetch<{ articles: KnowledgeArticle[] }>('/api/v1/kb'),
    create: (data: { title: string; content: string; tags?: string[] }) =>
      apiFetch<{ article: KnowledgeArticle }>('/api/v1/kb', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: { title?: string; content?: string; tags?: string[] }) =>
      apiFetch<{ article: KnowledgeArticle }>(`/api/v1/kb/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      apiFetch<{ deleted: boolean }>(`/api/v1/kb/${id}`, { method: 'DELETE' }),
  },

  integrations: {
    list: () => apiFetch<{ integrations: IntegrationConfig[] }>('/api/v1/integrations'),
    upsert: (type: string, data: { credentials: Record<string, string>; enabled?: boolean; settings?: Record<string, unknown> }) =>
      apiFetch<{ integration: IntegrationConfig }>('/api/v1/integrations', {
        method: 'POST',
        body: JSON.stringify({ type, ...data }),
      }),
    toggle: (type: string, enabled: boolean) =>
      apiFetch<{ updated: boolean }>(`/api/v1/integrations/${type}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      }),
    remove: (type: string) =>
      apiFetch<{ deleted: boolean }>(`/api/v1/integrations/${type}`, { method: 'DELETE' }),
    test: (type: string) =>
      apiFetch<{ success: boolean; message: string }>(`/api/v1/integrations/${type}/test`, { method: 'POST' }),
  },

  activation: {
    overview: () => apiFetch<ActivationOverview>('/api/v1/activation/overview'),
    funnel: () => apiFetch<{ flowName: string | null; totalSessions: number; funnel: FunnelStep[] }>('/api/v1/activation/funnel'),
    timeline: (days = 30) => apiFetch<{ timeline: ActivationTimeline[] }>(`/api/v1/activation/timeline?days=${days}`),
    trend: () => apiFetch<ActivationTrend>('/api/v1/activation/trend'),
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface Org {
  id: string;
  name: string;
  apiKey: string;
  planType: string;
}

export interface OrgConfig extends Org {
  customInstructions: string | null;
}

export interface Conversation {
  id: string;
  status: string;
  triggeredBy: string | null;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
  endUser: { id: string; externalId: string | null; metadata: Record<string, unknown> };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  tokensUsed: number;
}

export interface ConversationDetail extends Omit<Conversation, 'messageCount'> {
  messages: Message[];
  endUser: { id: string; externalId: string | null; metadata: Record<string, unknown>; firstSeenAt: string; lastSeenAt: string };
}

export interface OverviewStats {
  totalConversations: number;
  conversationsThisWeek: number;
  activeUsers: number;
  avgMessagesPerConv: number;
  conversionRate: number;
}

export interface TimelinePoint {
  date: string;
  conversations: number;
}

export interface TriggerStat {
  trigger: string;
  count: number;
}

export interface BillingPlan {
  key: string;
  name: string;
  price: number;
  limit: number;
  current: boolean;
}

export interface ChecklistStep {
  id: string;
  organizationId: string;
  label: string;
  description: string;
  order: number;
  completionEvent: string | null;
  isRequired: boolean;
  createdAt: string;
}

export interface FollowUpConfig {
  emailEnabled: boolean;
  slackWebhookUrl: string | null;
  whatsappEnabled: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioFromNumber: string | null;
  followUpDelayMins: number;
  emailSubject: string;
  emailBody: string;
}

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  allDone: boolean;
}

export interface BillingStatus {
  plan: string;
  planName: string;
  price: number;
  monthlyMessageLimit: number;
  messagesUsedThisMonth: number;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  plans: BillingPlan[];
}

export interface OnboardingStep {
  id: string;
  flowId: string;
  order: number;
  title: string;
  intent: string;
  description: string;
  aiPrompt: string;
  smartQuestions: string[];
  actionType: string | null;
  actionConfig: Record<string, unknown>;
  completionEvent: string | null;
  isMilestone: boolean;
  createdAt: string;
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: OnboardingStep[];
}

export interface ActivationOverview {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  firstValueCount: number;
  avgTimeToValueMins: number | null;
}

export interface FunnelStep {
  stepId: string;
  stepTitle: string;
  order: number;
  isMilestone: boolean;
  started: number;
  completed: number;
  dropOff: number;
  dropOffRate: number;
  aiAssistedRate: number;
  avgTimeSecs: number | null;
}

export interface ActivationTimeline {
  date: string;
  started: number;
  completed: number;
  firstValue: number;
}

export interface ChurnUser {
  sessionId: string;
  userId: string | null;
  userMetadata: Record<string, unknown>;
  flowName: string;
  status: string;
  stepsCompleted: number;
  totalSteps: number;
  progressFraction: number;
  lastActiveAt: string;
  startedAt: string;
  firstSeenAt: string;
  currentStepId: string | null;
  score: number;
  risk: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommendation: string;
}

export interface ChurnAtRiskResponse {
  users: ChurnUser[];
  breakdown: { critical: number; high: number; medium: number; total: number };
}

export interface ChurnSummary {
  total: number;
  breakdown: { critical: number; high: number; medium: number; low: number };
  atRisk: number;
}

export interface AutoOptimizeSettings {
  enabled: boolean;
  threshold: number;
  minSessions: number;
  lastRunAt: string | null;
}

export interface AutoOptimizeRunResult {
  stepsScanned: number;
  stepsOptimized: number;
  stepsSkipped: number;
  optimized: Array<{
    stepId: string;
    stepTitle: string;
    completionRateBefore: number;
    previousPrompt: string | null;
    newPrompt: string;
    reason: string;
  }>;
}

export interface OptimizationLogEntry {
  id: string;
  stepId: string;
  stepTitle: string;
  stepIntent: string;
  triggeredBy: string;
  completionRateBefore: number | null;
  previousPrompt: string | null;
  newPrompt: string;
  reason: string;
  appliedAt: string;
}

export interface ActivationTrend {
  thisWeek: { sessions: number; completed: number; firstValue: number; completionRate: number; firstValueRate: number };
  lastWeek: { sessions: number; completed: number; firstValue: number; completionRate: number; firstValueRate: number };
  deltas: { sessions: number; completionRate: number; firstValueRate: number };
}

export interface BenchmarkOverview {
  org: {
    totalSessions: number;
    completedSessions: number;
    completionRate: number | null;
    firstValueCount: number;
    avgTimeToValueMins: number | null;
    aiAssistRate: number;
  };
  industry: {
    completionRate: number;
    timeToValueMins: number;
    dataPoints: number;
    orgCount: number;
  };
  score: number;
  dataMaturity: 'early' | 'growing' | 'mature';
}

export interface BenchmarkStep {
  stepId: string;
  stepTitle: string;
  intent: string;
  order: number;
  isMilestone: boolean;
  orgStarted: number;
  orgCompleted: number;
  orgDropOffRate: number | null;
  industryDropOffRate: number;
  delta: number | null;
  status: 'good' | 'average' | 'poor' | 'no_data';
  recommendation: string | null;
}

export interface OptimizeStep {
  stepId: string;
  stepTitle: string;
  intent: string;
  order: number;
  isMilestone: boolean;
  currentPrompt: string | null;
  latestSnapshot: string | null;
  stats: {
    total: number;
    completed: number;
    dropped: number;
    completionRate: number | null;
    avgMessages: number | null;
    avgTimeSecs: number | null;
    dropReasons: Record<string, number>;
  };
  health: number;
  needsOptimization: boolean;
}

export interface OptimizeSuggestion {
  stepId: string;
  stepTitle: string;
  currentPrompt: string | null;
  suggestedPrompt: string;
  changes: string[];
  expectedImpact: string;
  reasoning: string;
  stats: { total: number; completed: number; completionRate: number; avgMessages: number };
}

export interface IntegrationConfig {
  id: string;
  type: string; // segment | mixpanel | hubspot | webhook
  enabled: boolean;
  credentials: Record<string, string>; // masked values returned from API
  settings: Record<string, unknown>;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationTicket {
  id: string;
  status: 'open' | 'in_progress' | 'resolved';
  trigger: 'agent_detected' | 'user_requested';
  reason: string;
  agentMessage: string;
  notes: string | null;
  userId: string | null;
  userMetadata: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
}

export interface EscalationTicketDetail extends EscalationTicket {
  context: {
    userId: string | null;
    userMetadata: Record<string, unknown>;
    flowName: string;
    stepTitle: string;
    collectedData: Record<string, unknown>;
    recentMessages: Array<{ role: string; content: string }>;
  };
  userFirstSeen: string;
  sessionId: string;
  stepId: string | null;
}

export interface EndUserSummary {
  id: string;
  externalId: string | null;
  metadata: Record<string, unknown>;
  firstSeenAt: string;
  lastSeenAt: string;
  totalSessions: number;
  completedSessions: number;
  latestSession: {
    flowName: string;
    status: string;
    stepsCompleted: number;
    lastActiveAt: string;
  } | null;
}

export interface UserSessionStep {
  stepId: string;
  title: string;
  order: number;
  intent: string;
  status: string;
  completedAt: string | null;
  timeSpentMs: number;
  messagesCount: number;
  aiAssisted: boolean;
}

export interface UserSessionHistory {
  sessionId: string;
  flowId: string;
  flowName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  lastActiveAt: string;
  firstValueAt: string | null;
  collectedData: Record<string, unknown>;
  steps: UserSessionStep[];
}

export interface UserHistoryDetail {
  user: {
    id: string;
    externalId: string | null;
    metadata: Record<string, unknown>;
    firstSeenAt: string;
    lastSeenAt: string;
  };
  sessions: UserSessionHistory[];
  mergedCollectedData: Record<string, unknown>;
  totalSessions: number;
  completedSessions: number;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealEntry {
  originalSelector: string;
  status: 'healthy' | 'healing' | 'failing';
  healCount: number;
  failCount: number;
  lastSeen: string;
  actionType: string | null;
  page: string;
  strategies: string[];
  suggestedSelector: string | null;
  step: { id: string; title: string; flowId: string; flowName: string } | null;
}

export interface FlowHealthResponse {
  entries: HealEntry[];
  total: number;
  since: string;
}

export interface FlowExperiment {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'concluded';
  trafficSplit: number;
  winnerId: string | null;
  startedAt: string;
  concludedAt: string | null;
  controlFlow: { id: string; name: string };
  variantFlow:  { id: string; name: string };
  controlSessions?: number;
  variantSessions?:  number;
}

export interface ExperimentArmStats {
  total: number;
  completed: number;
  completionRate: number;
  avgTimeMs: number | null;
  stepStats: Array<{ stepId: string; title: string; order: number; completionRate: number }>;
}

export interface ExperimentResults {
  experiment: FlowExperiment;
  control: ExperimentArmStats;
  variant:  ExperimentArmStats;
  significant: boolean;
  zScore: number;
  lift: number | null;
}

export interface AlertConfig {
  selectorAlertEnabled: boolean;
  selectorAlertWebhook: string | null;
}

export interface IntentQuestion {
  raw: string;
  count: number;
  lastSeen: string;
  intent: 'how_to' | 'stuck' | 'navigation' | 'question' | 'other';
}

export interface IntentsResponse {
  questions: IntentQuestion[];
  categorySummary: Record<string, number>;
  totalMessages: number;
  days: number;
}

export interface FlowTemplateMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  benchmarkTimeToValueMins: number;
  stepCount: number;
}
