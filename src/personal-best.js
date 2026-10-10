const STORAGE_KEY = 'after-hours-best';

function validScore(value) {
  const score = Number(value);
  return Number.isSafeInteger(score) && score >= 0 ? score : 0;
}

export function createPersonalBest(storage = globalThis) {
  function read(name) {
    try { return validScore(storage[name].getItem(STORAGE_KEY)); }
    catch { return 0; }
  }

  function save(score) {
    try { storage.localStorage.setItem(STORAGE_KEY, String(score)); }
    catch { /* Keep the in-memory best when storage is unavailable. */ }
  }

  const localBest = read('localStorage');
  let best = Math.max(localBest, read('sessionStorage'));
  if (best > localBest) save(best);

  return {
    get score() { return best; },
    record(score) {
      const candidate = validScore(score);
      if (candidate > best) {
        best = candidate;
        save(best);
      }
      return best;
    },
  };
}
