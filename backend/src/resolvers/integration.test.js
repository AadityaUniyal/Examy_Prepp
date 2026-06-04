import assert from 'assert';
import { prisma } from '../prisma.js';
import mutationResolvers from './mutations.js';

console.log('Running backend integration tests...');

async function testIntegrationFlow() {
  const email = `integration_student_${Date.now()}@exameve.com`;
  const name = 'Integration Test Student';
  const password = 'secure_password_123';

  // 1. Test User Registration
  const regResult = await mutationResolvers.register(null, { email, password, name }, { res: null });
  assert(regResult.token, 'Registration should return an access token');
  assert.strictEqual(regResult.user.email, email, 'User email should match registration input');
  console.log('✓ Integration: User registration flow successful');

  // 2. Test User Login
  const loginResult = await mutationResolvers.login(null, { email, password }, { res: null });
  assert(loginResult.token, 'Login should return an access token');
  assert.strictEqual(loginResult.user.id, regResult.user.id, 'Logged in user ID should match registered user ID');
  console.log('✓ Integration: User credentials login flow successful');

  // Clean up user
  await prisma.user.delete({ where: { id: regResult.user.id } });
  console.log('✓ Integration: Test cleanup completed');
}

testIntegrationFlow()
  .then(() => {
    console.log('All backend integration tests passed successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
  });
