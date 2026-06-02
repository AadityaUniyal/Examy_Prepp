import assert from 'assert';
import queryResolvers from './queries.js';
import mutationResolvers from './mutations.js';

console.log('Running backend resolver tests...');

async function testMe() {
  const context = { userId: null };
  try {
    await queryResolvers.me(null, null, context);
    assert.fail('me query should throw when unauthenticated');
  } catch (err) {
    assert.strictEqual(err.message, 'Not authenticated. Please provide a valid JWT token.');
    console.log('✓ me query Authentication enforcement test passed');
  }
}

async function testRequireAuth() {
  try {
    await mutationResolvers.createExam(null, {}, { userId: null });
    assert.fail('createExam should throw when unauthenticated');
  } catch (err) {
    assert.strictEqual(err.message, 'Not authenticated. Please provide a valid JWT token.');
    console.log('✓ createExam Authentication enforcement test passed');
  }
}

async function runTests() {
  try {
    await testMe();
    await testRequireAuth();
    console.log('All backend resolver tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
