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
  maxTurns: number;
  tags: string[];
}

export interface EvalResult {
  scenarioId: string;
  description: string;
  passed: boolean;
  turns: number;
  actionsProduced: string[];
  expectedActions: string[];
  firstActionMatch: boolean;
  containsExpected: boolean;
  reachedCompletion: boolean;
  error?: string;
  durationMs: number;
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

  try {
    const turnHistory: GoalTurn[] = [];

    for (let turn = 0; turn < scenario.maxTurns; turn++) {
      const action = await runAgentGoal({
        org: MOCK_ORG as Organization,
        goal: scenario.goal,
        pageContext: scenario.mockDom,
        turnHistory,
        sessionId: `eval-${scenario.id}-turn-${turn}`,
      });

      actionsProduced.push(action.type);
      turnHistory.push({ role: 'assistant', content: `Turn ${turn + 1}: executed ${action.type}` });

      if (action.type === 'goal_complete' || action.type === 'escalate_to_human') break;
      if (action.type === 'ask_clarification') break;
    }

    const firstActionMatch = actionsProduced[0] === scenario.expectedActions[0];
    const containsExpected = scenario.expectedActions.every((exp) => actionsProduced.includes(exp));
    const reachedCompletion = actionsProduced.includes('goal_complete');

    const passed = firstActionMatch && (containsExpected || reachedCompletion);

    return {
      scenarioId: scenario.id,
      description: scenario.description,
      passed,
      turns: actionsProduced.length,
      actionsProduced,
      expectedActions: scenario.expectedActions,
      firstActionMatch,
      containsExpected,
      reachedCompletion,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      description: scenario.description,
      passed: false,
      turns: 0,
      actionsProduced,
      expectedActions: scenario.expectedActions,
      firstActionMatch: false,
      containsExpected: false,
      reachedCompletion: false,
      error: (err as Error).message,
      durationMs: Date.now() - start,
    };
  }
}
