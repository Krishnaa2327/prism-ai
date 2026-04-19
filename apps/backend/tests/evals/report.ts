import { EvalResult } from './runner';

export function printReport(results: EvalResult[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const passRate = Math.round((passed / total) * 100);

  console.log('\n' + '═'.repeat(60));
  console.log('  PRISM AGENT EVAL REPORT');
  console.log('═'.repeat(60));
  console.log(`  Pass rate: ${passed}/${total} (${passRate}%)`);
  console.log(`  Total duration: ${results.reduce((s, r) => s + r.durationMs, 0)}ms`);
  console.log('─'.repeat(60));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`\n${icon} ${r.scenarioId}`);
    console.log(`   ${r.description}`);
    console.log(`   Expected: [${r.expectedActions.join(', ')}]`);
    console.log(`   Got:      [${r.actionsProduced.join(', ')}]`);
    console.log(`   Turns: ${r.turns} | First match: ${r.firstActionMatch} | Completion: ${r.reachedCompletion} | ${r.durationMs}ms`);
    if (r.error) console.log(`   ERROR: ${r.error}`);
  }

  console.log('\n' + '═'.repeat(60));
  if (passRate >= 85) {
    console.log(`  ✅ PASS — ${passRate}% meets the ≥85% bar`);
  } else {
    console.log(`  ❌ FAIL — ${passRate}% is below the ≥85% bar`);
  }
  console.log('═'.repeat(60) + '\n');

  if (passRate < 85) process.exitCode = 1;
}
