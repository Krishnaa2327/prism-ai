import { runAgentGoal, GoalTurn } from '../../src/services/agent';
import { Organization } from '@prisma/client';

export interface EvalScenario {
  id: string;
  description: string;
  goal: string;
  mockDom: {
    url: string;
    title: string;
    headings: string[];
    elements: Array<{ tag: string; selector: string; text: string; type?: string; value?: string }>;
    semanticSummary?: string;
  };
  expectedActions: string[];
  /** Phase 4: action types that must NOT appear — fails the scenario if seen */
  forbiddenActions?: string[];
  maxTurns: number;
  tags: string[];
  seedTurnHistory?: GoalTurn[];
}

export interface EvalResult {
  scenarioId: string;
  description: string;
  passed: boolean;
  turns: number;
  actionsProduced: string[];
  expectedActions: string[];
  forbiddenActions: string[];
  forbiddenViolations: string[];
  firstActionMatch: boolean;
  containsExpected: boolean;
  reachedCompletion: boolean;
  error?: string;
  durationMs: number;
  turnLatenciesMs: number[];
}

const MOCK_ORG: Partial<Organization> = {
  id: 'eval-org',
  name: 'Eval Test Company',
  customInstructions: null,
  planType: 'growth',
};

export async function runScenario(scenario: EvalScenario): Promise<EvalResult> {
  const start = Date.now();
  const actionsProduced: string[] = [];
  const turnLatenciesMs: number[] = [];

  try {
    const turnHistory: GoalTurn[] = scenario.seedTurnHistory ? [...scenario.seedTurnHistory] : [];

    for (let turn = 0; turn < scenario.maxTurns; turn++) {
      const t0 = process.hrtime.bigint();
      const action = await runAgentGoal({
        org: MOCK_ORG as Organization,
        goal: scenario.goal,
        pageContext: scenario.mockDom,
        turnHistory,
        sessionId: `eval-${scenario.id}-turn-${turn}`,
      });
      turnLatenciesMs.push(Number(process.hrtime.bigint() - t0) / 1_000_000);

      actionsProduced.push(action.type);
      turnHistory.push({ role: 'assistant', content: `Turn ${turn + 1}: executed ${action.type}` });

      if (action.type === 'goal_complete' || action.type === 'escalate_to_human') break;
      if (action.type === 'ask_clarification') break;
      if (action.type === 'degrade_to_manual') break; // halt after degrade — user must respond
    }

    const firstActionMatch = actionsProduced[0] === scenario.expectedActions[0];
    const containsExpected = scenario.expectedActions.every((exp) => actionsProduced.includes(exp));
    const reachedCompletion = actionsProduced.includes('goal_complete');

    // Phase 4: forbidden action check
    const forbiddenActions = scenario.forbiddenActions ?? [];
    const forbiddenViolations = forbiddenActions.filter((f) => actionsProduced.includes(f));
    const forbiddenClean = forbiddenViolations.length === 0;

    const passed = forbiddenClean && firstActionMatch && (containsExpected || reachedCompletion);

    return {
      scenarioId: scenario.id, description: scenario.description, passed,
      turns: actionsProduced.length, actionsProduced, expectedActions: scenario.expectedActions,
      forbiddenActions, forbiddenViolations,
      firstActionMatch, containsExpected, reachedCompletion,
      durationMs: Date.now() - start, turnLatenciesMs,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id, description: scenario.description, passed: false,
      turns: 0, actionsProduced, expectedActions: scenario.expectedActions,
      forbiddenActions: scenario.forbiddenActions ?? [], forbiddenViolations: [],
      firstActionMatch: false, containsExpected: false, reachedCompletion: false,
      error: (err as Error).message, durationMs: Date.now() - start, turnLatenciesMs,
    };
  }
}
