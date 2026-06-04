import assert from 'assert';

console.log('Running urgency time decay mathematical formula tests...');

// Urgency Heuristic Fallback function from python priority router logic
function calculatePriority(weightage, confidence, days_until_exam, complexity) {
  const hours_left = Math.max(days_until_exam * 24.0, 1.0);
  const time_weight = 1.0 / (1.0 + Math.exp(-0.1 * (48.0 - hours_left)));
  const urgency = weightage * (1.0 - confidence) * time_weight;
  const complexity_factor = 1.0 + complexity;
  return urgency * 0.7 + complexity_factor * 0.3;
}

function testTimeDecay() {
  const weightage = 40;
  const confidence = 0.4;
  const complexity = 0.5;

  // 10 days until exam (approx 240 hours left) -> time_weight should be near 0
  const priorityFar = calculatePriority(weightage, confidence, 10, complexity);
  
  // 1 day until exam (approx 24 hours left) -> time_weight should be high
  const priorityClose = calculatePriority(weightage, confidence, 1, complexity);

  console.log(`Priority Far (10 days): ${priorityFar.toFixed(3)}`);
  console.log(`Priority Close (1 day): ${priorityClose.toFixed(3)}`);

  assert(priorityClose > priorityFar, 'Urgency score must increase as exam date approaches (time decay)');
  console.log('✓ Urgency time decay mathematical test passed');
}

try {
  testTimeDecay();
  console.log('Urgency tests completed successfully!');
  process.exit(0);
} catch (err) {
  console.error('Urgency test failed:', err.message);
  process.exit(1);
}
