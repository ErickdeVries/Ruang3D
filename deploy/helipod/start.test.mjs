import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync, openSync, closeSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, delimiter } from 'node:path'
import { spawnSync } from 'node:child_process'

function launch(t, env = {}, args = [], { built = true, hermes = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ruang-launcher-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'deploy/helipod'), { recursive: true })
  mkdirSync(join(root, 'bin'))
  copyFileSync(new URL('./start.mjs', import.meta.url), join(root, 'deploy/helipod/start.mjs'))
  writeFileSync(join(root, 'package.json'), '{"type":"module"}')
  if (hermes) writeFileSync(join(root, 'bin/hermes'), '#!/bin/sh\nexit 0\n', { mode: 0o755 })
  if (built) {
    mkdirSync(join(root, 'build/server'), { recursive: true })
    mkdirSync(join(root, 'dist'))
    writeFileSync(join(root, 'dist/index.html'), '<html></html>')
    // Model the access module boundary without creating actual credentials.
    writeFileSync(join(root, 'build/server/access.js'), `
      export class AccessStore {
        async state() { return JSON.parse(process.env.TEST_STATE || '{"enabled":true}'); }
        async set() { throw new Error('Unexpected credential mutation'); }
      }
      export const generateCode = () => { throw new Error('Unexpected credential generation'); };
    `)
    writeFileSync(join(root, 'build/server/index.js'), 'console.log(JSON.stringify({started:true,host:process.env.RUANG_HOST,port:process.env.RUANG_PORT}))')
  }
  const stdout = join(root, 'stdout.txt')
  const stderr = join(root, 'stderr.txt')
  const out = openSync(stdout, 'w')
  const err = openSync(stderr, 'w')
  let result
  try {
    result = spawnSync(process.execPath, [join(root, 'deploy/helipod/start.mjs'), ...args], {
    encoding: 'utf8', timeout: 10000, stdio: ['ignore', out, err],
    env: { PATH: join(root, 'bin') + delimiter + '/usr/bin:/bin', ...env },
    })
  } finally { closeSync(out); closeSync(err) }
  assert.ifError(result.error)
  return { ...result, stdout: readFileSync(stdout, 'utf8'), stderr: readFileSync(stderr, 'utf8') }
}

test('container defaults and existing access code are preserved', t => {
  const r = launch(t)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /"host":"0.0.0.0","port":"3001"/)
})
test('explicit Ruang port overrides platform PORT', t => {
  const r = launch(t, { RUANG_HOST: '127.0.0.1', RUANG_PORT: '4000', PORT: '8080' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /"host":"127.0.0.1","port":"4000"/)
})
test('platform PORT is used when Ruang port is omitted', t => {
  const r = launch(t, { PORT: '8080' })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /"port":"8080"/)
})
test('prepare never starts the HTTP server', t => {
  const r = launch(t, {}, ['--prepare'])
  assert.equal(r.status, 0, r.stderr)
  assert.doesNotMatch(r.stdout, /"started":true/)
})
test('invalid ports fail before server startup', t => {
  for (const port of ['0', '65536', 'abc', '3001x', '']) {
    const r = launch(t, { RUANG_PORT: port })
    assert.notEqual(r.status, 0)
    assert.match(r.stderr, /harus berupa nomor port/)
  }
})
test('missing builds report installation step', t => {
  const r = launch(t, {}, [], { built: false })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /install.sh/)
})
test('missing Hermes executable fails clearly', t => {
  const r = launch(t, {}, [], { hermes: false })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /hermes tidak ditemukan/)
})
test('damaged auth state is not overwritten', t => {
  const r = launch(t, { TEST_STATE: '{"enabled":true,"broken":true}' })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /tidak dapat dibaca/)
})
test('noninteractive startup never prints or creates an access code', t => {
  const r = launch(t, { TEST_STATE: '{"enabled":false}' })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /terminal interaktif/)
  assert.doesNotMatch(r.stderr, /Unexpected credential/)
})
