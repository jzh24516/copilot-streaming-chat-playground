import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('latest Agent Framework mode stays isolated from the proven POC', () => {
  const packageJson = JSON.parse(read('package.json'));
  const project = read('sidecars/AgentFrameworkGhcpLatest/AgentFrameworkGhcpLatest.csproj');
  const index = read('public/index.html');
  const app = read('public/app.js');

  assert.match(
    packageJson.scripts['agent-framework:poc'],
    /AgentFrameworkGhcp\.csproj --urls http:\/\/127\.0\.0\.1:3980$/
  );
  assert.match(
    packageJson.scripts['agent-framework:latest'],
    /AgentFrameworkGhcpLatest\.csproj --urls http:\/\/127\.0\.0\.1:3981$/
  );
  assert.match(project, /1\.19\.0-preview\.260822\.1/);
  assert.match(index, /option value="ghcpAgentFrameworkLatest"/);
  assert.match(index, /id="ghcpAgentFrameworkLatestField" hidden/);
  assert.match(app, /runtime: 'ghcpAgentFrameworkLatest'/);
  assert.match(app, /'http:\/\/127\.0\.0\.1:3981'/);
  assert.match(app, /ScopeHelper\.getScopeFromSettings\(settings\)/);
});