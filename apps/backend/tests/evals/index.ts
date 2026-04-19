import 'dotenv/config';
import { runScenario } from './runner';
import { printReport } from './report';
import { payrollScenarios } from './scenarios/payroll';
import { gstScenarios } from './scenarios/gst';
import { paymentsScenarios } from './scenarios/payments';
import { hinglishScenarios } from './scenarios/hinglish';
import { recoveryScenarios } from './scenarios/recovery';

const ALL_SCENARIOS = [
  ...payrollScenarios,
  ...gstScenarios,
  ...paymentsScenarios,
  ...hinglishScenarios,
  ...recoveryScenarios,
];

async function main() {
  console.log(`Running ${ALL_SCENARIOS.length} eval scenarios...`);

  const results = [];
  for (const scenario of ALL_SCENARIOS) {
    process.stdout.write(`  Running ${scenario.id}... `);
    const result = await runScenario(scenario);
    results.push(result);
    console.log(result.passed ? 'PASS' : 'FAIL');
  }

  printReport(results);
}

main().catch(console.error);
