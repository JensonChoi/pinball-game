import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalBest } from '../src/personal-best.js';

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem(key) { assert.equal(key, 'after-hours-best'); return value; },
    setItem(key, next) { assert.equal(key, 'after-hours-best'); value = next; },
  };
}

test('personal best persists across a new page session and never decreases', () => {
  const localStorage = memoryStorage('300');
  const best = createPersonalBest({ localStorage });
  assert.equal(best.score, 300);
  assert.equal(best.record(200), 300);
  assert.equal(best.record(600), 600);
  assert.equal(localStorage.getItem('after-hours-best'), '600');
  assert.equal(best.record(0), 600);
  assert.equal(createPersonalBest({ localStorage }).score, 600);
});

test('migration preserves the higher of the local and existing session records', () => {
  for (const [local, session, expected] of [[null, '400', 400], ['200', '500', 500], ['700', '300', 700]]) {
    const localStorage = memoryStorage(local);
    const best = createPersonalBest({ localStorage, sessionStorage: memoryStorage(session) });
    assert.equal(best.score, expected);
    assert.equal(localStorage.getItem('after-hours-best'), String(expected));
  }
});

test('invalid stored scores and updates cannot poison the personal best', () => {
  for (const value of ['NaN', 'Infinity', '-100', '1.5', '9007199254740992', 'invalid', null, '']) {
    const best = createPersonalBest({ localStorage: memoryStorage(value) });
    assert.equal(best.score, 0);
    best.record(100);
    best.record(value);
    assert.equal(best.score, 100);
  }
});

test('blocked storage getters retain a working in-memory record', () => {
  const storage = {
    get localStorage() { throw new Error('Blocked'); },
    get sessionStorage() { throw new Error('Blocked'); },
  };
  const best = createPersonalBest(storage);
  assert.equal(best.score, 0);
  assert.equal(best.record(500), 500);
  assert.equal(best.record(100), 500);
});

test('failed reads and writes preserve migrated and newly earned records in memory', () => {
  const localStorage = {
    getItem() { throw new Error('Read unavailable'); },
    setItem() { throw new Error('Quota exceeded'); },
  };
  const best = createPersonalBest({ localStorage, sessionStorage: memoryStorage('300') });
  assert.equal(best.score, 300);
  assert.equal(best.record(800), 800);
  assert.equal(best.record(0), 800);
});
