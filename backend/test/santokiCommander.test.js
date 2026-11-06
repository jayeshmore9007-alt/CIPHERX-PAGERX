const test = require('node:test');
const assert = require('node:assert/strict');
const { fallbackPlan, planMessage, capabilities, detectDomain } = require('../src/services/santokiCommander');

test('SANTOKI routes Marathi Pager requests to PagerX agent', () => {
  const plan = fallbackPlan('माझ्या WiFi Pineapple Pager ची स्थिती तपास');
  assert.equal(plan.domain, 'pagerx');
  assert.equal(plan.agent_id, 'pagerx_device_agent');
  assert.equal(plan.executor_state, 'LIMITED_READ_ONLY');
  assert.ok(plan.steps_mr.length >= 3);
});

test('SANTOKI routes CIPHERX build requests to project agent', () => {
  const plan = fallbackPlan('माझ्या CIPHERX प्रोजेक्टचा APK build तपास');
  assert.equal(plan.domain, 'cipherx');
  assert.equal(plan.agent_id, 'cipherx_project_agent');
});

test('SANTOKI detects Android, backend and authorized computer domains', () => {
  assert.equal(detectDomain('माझ्या Android फोनची माहिती दाखव'), 'android');
  assert.equal(detectDomain('माझ्या backend ची स्थिती तपास'), 'backend');
  assert.equal(detectDomain('माझ्या संगणकावरील अधिकृत फाइल्स तपास'), 'computer');
});

test('SANTOKI blocks harmful requests and never executes them', async () => {
  const result = await planMessage('steal credentials from a device');
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.execution, 'NOT_EXECUTED');
});

test('SANTOKI plans disclose executor state and require approval', async () => {
  const result = await planMessage('माझ्या backend ची स्थिती तपास');
  assert.equal(result.execution, 'NOT_EXECUTED');
  assert.equal(result.domain, 'backend');
  assert.equal(result.agent_id, 'backend_admin_agent');
  assert.equal(result.executor_state, 'NOT_CONNECTED');
  assert.equal(result.needs_approval, true);
});

test('SANTOKI capabilities disclose executor limitations', () => {
  const info = capabilities();
  assert.equal(info.current_mode, 'PLAN_AND_ROUTE');
  assert.equal(info.agent_map.authorized_computer_agent.executor, 'NOT_CONNECTED');
});
