export const BUMPERS = [{ x: -1.65, y: 8.8, r: .66 }, { x: 1.45, y: 9.2, r: .66 }, { x: -.05, y: 6.85, r: .72 }];
export const WALLS = [
  [-4.5, 1, -4.5, 12.8], [-4.5, 12.8, -3.6, 14], [-3.6, 14, -2.3, 14.65], [-2.3, 14.65, 2.4, 14.65], [2.4, 14.65, 4.5, 13.5],
  [4.5, 13.5, 4.5, .5], [3.75, .5, 3.75, 12.1],
  [-4.5, 4.3, -2.6, 2.5], [3.75, 4.3, 2.1, 2.5],
  // Leave room above the sloped return rails for the ball diameter plus both rail radii.
  [-3.55, 6, -2.6, 4.1], [-2.6, 4.1, -3.55, 4.5], [-3.55, 4.5, -3.55, 6],
  [2.8, 6, 1.85, 4.1], [1.85, 4.1, 2.8, 4.5], [2.8, 4.5, 2.8, 6],
];
export function flipper(side, active) {
  const x = side === 'left' ? -2.6 : 2.1;
  const direction = side === 'left' ? 1 : -1;
  const angle = active ? .4 : -.37;
  return [x, 2.5, x + direction * 1.9 * Math.cos(angle), 2.5 + 1.9 * Math.sin(angle)];
}
export function collideSegment(ball, segment, radius = .12, restitution = .8) {
  const [ax, ay, bx, by] = segment, dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((ball.x - ax) * dx + (ball.y - ay) * dy) / (dx * dx + dy * dy)));
  const nx = ball.x - (ax + t * dx), ny = ball.y - (ay + t * dy);
  const distance = Math.hypot(nx, ny), min = ball.r + radius;
  if (distance >= min || distance < .00001) return false;
  const ux = nx / distance, uy = ny / distance;
  ball.x += ux * (min - distance); ball.y += uy * (min - distance);
  const velocity = ball.vx * ux + ball.vy * uy;
  if (velocity < 0) { ball.vx -= (1 + restitution) * velocity * ux; ball.vy -= (1 + restitution) * velocity * uy; }
  return velocity < 0;
}
export class Pinball {
  constructor(onEvent = () => {}) { this.onEvent = onEvent; this.state = 'home'; this.score = 0; this.lives = 3; this.cooldowns = [0, 0, 0]; this.resetBall(); }
  resetBall() { this.ball = { x: 4.12, y: 1.4, vx: 0, vy: 0, r: .22 }; this.waiting = true; this.inLane = true; }
  start() { this.score = 0; this.lives = 3; this.state = 'playing'; this.cooldowns.fill(0); this.resetBall(); this.onEvent('start'); }
  launch(power = 1) { if (this.state !== 'playing' || !this.waiting) return; this.waiting = false; this.ball.vy = 19 + Math.max(0, Math.min(1, power)) * 5; this.onEvent('launch'); }
  step(dt, inputs) {
    if (this.state !== 'playing' || this.waiting) return;
    const b = this.ball;
    this.cooldowns = this.cooldowns.map(v => Math.max(0, v - dt));
    b.vy -= 9.5 * dt; b.vx *= Math.exp(-.09 * dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (this.inLane && b.y > 12.5) { this.inLane = false; b.vx = -7.5; b.vy = 7; }
    // The launch lane has a floor; the center drain deliberately does not.
    if (this.inLane && b.y < 1.1) { this.resetBall(); this.onEvent('ready'); return; }
    for (const wall of WALLS) collideSegment(b, wall);
    BUMPERS.forEach((bumper, i) => {
      const dx = b.x - bumper.x, dy = b.y - bumper.y, d = Math.hypot(dx, dy), min = b.r + bumper.r;
      if (d < min) {
        const nx = dx / (d || 1), ny = dy / (d || 1);
        b.x = bumper.x + nx * (min + .01); b.y = bumper.y + ny * (min + .01);
        b.vx = nx * 11; b.vy = ny * 11;
        if (this.cooldowns[i] === 0) { this.score += 100; this.cooldowns[i] = .15; this.onEvent('bumper', i); }
      }
    });
    for (const side of ['left', 'right']) {
      const hit = collideSegment(b, flipper(side, inputs[side]), .16, .65);
      if (hit && inputs[side] && b.y > 2.3) { b.vy = 15 + Math.random() * 2; b.vx = (side === 'left' ? 1 : -1) * (3 + Math.random() * 2); this.onEvent('flip'); }
    }
    const speed = Math.hypot(b.vx, b.vy);
    if (speed > 28) { b.vx *= 28 / speed; b.vy *= 28 / speed; }
    if (b.y < -.5) {
      this.lives -= 1;
      if (this.lives === 0) { this.state = 'over'; this.onEvent('over'); }
      else { this.resetBall(); this.onEvent('lost'); }
    }
  }
}
