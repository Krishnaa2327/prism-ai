import { EvalResult } from './runner';

export function printReport(results: EvalResult[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const passRate = Math.round((passed / total) * 100);

  const allLatencies = results.flatMap((r) => r.turnLatenciesMs).sort((a, b) => a - b);
  const p95Index = Math.floor(allLatencies.length * 0.95);
  const p95Ms = allLatencies[p95Index] ?? 0;

  console.log('\n' + '═'.repeat(60));
  console.log('  PRISM AGENT EVAL REPORT');
  console.log('═'.repeat(60));
  console.log(`  Pass rate: ${passed}/${total} (${passRate}%)`);
  console.log(`  P95 turn latency: ${Math.round(p95Ms)}ms`);
  console.log(`  Total duration: ${results.reduce((s, r) => s + r.durationMs, 0)}ms`);
  console.log('─'.repeat(60));

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    const avgMs = r.turnLatenciesMs.length > 0
      ? Math.round(r.turnLatenciesMs.reduce((s, v) => s + v, 0) / r.turnLatenciesMs.length)
      : 0;
    console.log(`\n${icon} ${r.scenarioId}`);
    console.log(`   ${r.description}`);
    console.log(`   Expected: [${r.expectedActions.join(', ')}]`);
    console.log(`   Got:      [${r.actionsProduced.join(', ')}]`);
    if (r.forbiddenViolations.length > 0) {
      console.log(`   ⛔ FORBIDDEN ACTIONS SEEN: [${r.forbiddenViolations.join(', ')}]`);
    }
    console.log(`   Turns: ${r.turns} | First match: ${r.firstActionMatch} | Completion: ${r.reachedCompletion} | ${r.durationMs}ms (avg turn: ${Math.round(r.turnLatenciesMs.reduce((s, v) => s + v, 0) / Math.max(r.turnLatenciesMs.length, 1))}ms)`);
    if (r.error) console.log(`   ERROR: ${r.error}`);

  }

  console.log('\n' + '═'.repeat(60));

  if (passRate >= 85) {
    console.log(`  ✅ PASS — ${passRate}% meets the ≥85% bar`);
  } else {
    console.log(`  ❌ FAIL — ${passRate}% is below the ≥85% bar`);
    process.exitCode = 1;
  }

  if (p95Ms <= 8000) {
    console.log(`  ✅ LATENCY — P95 ${Math.round(p95Ms)}ms within 8000ms cap`);
  } else {
    console.log(`  ❌ LATENCY — P95 ${Math.round(p95Ms)}ms exceeds 8000ms cap`);
    process.exitCode = 1;
  }

  console.log('═'.repeat(60) + '\n');
}
