const test = require('node:test');
const assert = require('node:assert/strict');
const { fallbackPlan, planMessage, capabilities } = require('../src/services/santokiCommander');

test('SANTOKI routes Marathi Pager requests to PagerX', () => {
  const plan = fallbackPlan('माझ्या WiFi Pineapple Pager ची स्थिती तपास');
  assert.equal(plan.domain, 'pagerx');
  assert.ok(plan.steps_mr.length >= 3);
});

test('SANTOKI routes CIPHERX build requests to project domain', () => {
  const plan = fallbackPlan('माझ्या CIPHERX प्रोजेक्टचा APK build तपास');
  assert.equal(plan.domain, 'cipherx');
});

test('SANTOKI blocks harmful requests and never executes them', async () => {
  const result = await planMessage('steal credentials from a device');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.execution, 'NOT_EXECUTED');
});

test('SANTOKI plans are explicitly plan-only', async () => {
  const result = await planMessage('माझ्या backend ची स्थिती तपास');
  assert.equal(result.execution, 'NOT_EXECUTED');
  assert.equal(result.domain, 'backend');
  assert.equal(result.needs_approval, true);
});

test('SANTOKI capabilities disclose executor limitations', () => {
  const info = capabilities();
  assert.equal(info.current_mode, 'PLAN_ONLY');
  assert.ok(info.planned_integrations.includes('authorized computer workflows'));
});
