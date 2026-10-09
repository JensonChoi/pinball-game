import test from 'node:test';
import assert from 'node:assert/strict';
import { Pinball, BUMPERS } from '../src/physics.js';
const idle = { left: false, right: false };
for (const [side, positions] of [['left', [-4.15, -4, -3.9]], ['right', [3.15, 3.25, 3.4]]]) {
  test(`balls falling along the ${side} side pass beneath the triangle and drain normally`, () => {
    for (const x of positions) {
      const events = [];
      const game = new Pinball(event => events.push(event));
      game.start(); game.launch(); game.inLane = false;
      Object.assign(game.ball, { x, y: 6.5, vx: 0, vy: 0 });
      let reachedFlippers = false;
      for (let i = 0; i < 180 * 10 && !game.waiting; i++) {
        game.step(1 / 180, idle);
        if (game.ball.y < 3.5 && game.ball.x > -3.2 && game.ball.x < 2.45) reachedFlippers = true;
      }
      assert.ok(reachedFlippers, `ball starting at x=${x} should pass into the flipper area`);
      assert.equal(game.lives, 2);
      assert.equal(game.waiting, true);
      assert.equal(game.state, 'playing');
      assert.equal(events.filter(event => event === 'lost').length, 1);
    }
  });
}
test('starts with three lives, zero score, and a ball ready to launch', () => {
  const game = new Pinball(); game.start();
  assert.equal(game.lives, 3); assert.equal(game.score, 0); assert.equal(game.waiting, true);
  game.launch(1); assert.equal(game.waiting, false); assert.equal(game.ball.vy, 24);
});
test('a minimum-power launch leaves the lane and enters the playfield', () => {
  const game = new Pinball(); game.start(); game.launch(0);
  for (let i = 0; i < 180; i++) game.step(1 / 180, idle);
  assert.equal(game.inLane, false); assert.ok(game.ball.x < 3.75);
});
test('three drains end the game; restart resets lives and score', () => {
  const events = []; const game = new Pinball(event => events.push(event)); game.start();
  for (let remaining = 2; remaining >= 0; remaining--) {
    game.launch(); game.inLane = false; game.ball.x = 0; game.ball.y = -1;
    game.step(1 / 180, idle); assert.equal(game.lives, remaining);
    assert.equal(game.state, remaining ? 'playing' : 'over');
  }
  assert.equal(events.filter(event => event === 'over').length, 1);
  game.step(1, idle); assert.equal(game.lives, 0);
  game.score = 900; game.start(); assert.equal(game.score, 0); assert.equal(game.lives, 3);
});
test('a bumper collision awards 100 points and kicks the ball outward', () => {
  const game = new Pinball(); game.start(); game.launch(); game.inLane = false;
  game.ball.x = BUMPERS[0].x + .8; game.ball.y = BUMPERS[0].y; game.ball.vx = -1; game.ball.vy = 0;
  game.step(1 / 180, idle); assert.equal(game.score, 100); assert.ok(game.ball.vx > 0);
});
test('paused simulation does not move or launch the ball', () => {
  const game = new Pinball(); game.start(); game.state = 'paused'; const before = { ...game.ball };
  game.launch(); game.step(1, idle); assert.deepEqual(game.ball, before); assert.equal(game.waiting, true);
});
