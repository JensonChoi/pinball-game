import * as THREE from 'three';
import './style.css';
import { Pinball, BUMPERS, WALLS, flipper } from './physics.js';

const $ = id => document.getElementById(id);
const format = value => String(value).padStart(6, '0');
let best = 0;
try { best = Math.max(0, Number(sessionStorage.getItem('after-hours-best')) || 0); } catch { /* Storage may be disabled. The in-memory record still works. */ }
let soundEnabled = false, audio, charging = false, chargeStart = 0, previousBest = best;
const inputs = { left: false, right: false };
const flashes = [0, 0, 0];
function beep(frequency, duration = .09) {
  if (!soundEnabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    void audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency / 2, audio.currentTime + duration);
    gain.gain.setValueAtTime(.09, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + duration);
  } catch { /* Audio is optional. */ }
}
const game = new Pinball((event, index) => {
  if (event === 'bumper') { flashes[index] = 1; beep(520 + index * 170); }
  if (event === 'launch') beep(220, .2);
  if (event === 'flip') beep(130, .05);
  if (event === 'lost') { beep(100, .3); $('status').textContent = 'BALL LOST · HOLD SPACE TO LAUNCH'; }
  if (game.score > best) { best = game.score; try { sessionStorage.setItem('after-hours-best', String(best)); } catch { /* Keep the in-memory best. */ } }
  if (event === 'over') { clearInputs(); showOverlay('LAST CALL', 'Game over.', `Final score: ${format(game.score)}${game.score > previousBest ? '\nA new session best. Nicely played.' : '\nThere’s always one more game.'}`, 'PLAY AGAIN'); beep(80, .5); $('status').textContent = 'THAT’S A WRAP · PLAY AGAIN?'; }
  if (event === 'start' || event === 'ready') $('status').textContent = 'HOLD SPACE TO LAUNCH';
  if (event === 'launch') $('status').textContent = 'KEEP THE NIGHT ALIVE';
  updateScore();
});
function updateScore() { $('score').textContent = format(game.score); $('best').textContent = $('home-best').textContent = format(best); [...$('lives').children].forEach((el, i) => el.classList.toggle('lost', i >= game.lives)); $('lives').setAttribute('aria-label', `${game.lives} balls remaining`); }
function clearInputs() { inputs.left = inputs.right = false; charging = false; document.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed')); $('launch-control').textContent = 'HOLD TO LAUNCH'; }
function showOverlay(label, title, copy, action) { $('overlay-label').textContent = label; $('overlay-title').textContent = title; $('overlay-copy').textContent = copy; $('overlay-action').innerHTML = `${action} <span>↗</span>`; $('overlay').hidden = false; $('overlay-action').focus(); }
function start() { previousBest = best; clearInputs(); $('overlay').hidden = true; document.body.classList.add('playing'); $('controls').hidden = $('game-actions').hidden = false; game.start(); resize(); window.scrollTo(0, 0); $('pause').focus(); }
function goHome() { game.state = 'home'; clearInputs(); game.resetBall(); $('overlay').hidden = true; document.body.classList.remove('playing'); $('controls').hidden = $('game-actions').hidden = true; $('status').textContent = 'READY WHEN YOU ARE'; resize(); $('start').focus(); }
function pause() {
  if (game.state === 'playing') { game.state = 'paused'; clearInputs(); showOverlay('TAKE A BREATHER', 'On pause.', 'The night can wait.', 'KEEP PLAYING'); }
  else if (game.state === 'paused') { game.state = 'playing'; $('overlay').hidden = true; $('pause').focus(); }
}
function beginCharge() { if (game.state === 'playing' && game.waiting && !charging) { charging = true; chargeStart = performance.now(); } }
function releaseCharge() { if (!charging) return; charging = false; game.launch(Math.min(1, (performance.now() - chargeStart) / 1000)); $('launch-control').textContent = 'HOLD TO LAUNCH'; }
$('start').onclick = start;
$('home').onclick = $('quit').onclick = goHome;
$('pause').onclick = pause;
$('overlay-action').onclick = () => game.state === 'paused' ? pause() : start();
$('sound').onclick = () => { soundEnabled = !soundEnabled; $('sound').textContent = soundEnabled ? 'SOUND ON' : 'SOUND OFF'; $('sound').setAttribute('aria-pressed', String(soundEnabled)); $('sound').setAttribute('aria-label', soundEnabled ? 'Disable sound' : 'Enable sound'); beep(440); };
document.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD', 'KeyP', 'Escape'].includes(event.code)) return;
  if (game.state === 'home' || game.state === 'over') return;
  // Let focused buttons retain native Space activation while a dialog is open.
  if (game.state === 'paused' && event.code === 'Space') return;
  event.preventDefault();
  if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) { pause(); return; }
  if (game.state !== 'playing') return;
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputs.left = true;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') inputs.right = true;
  if (event.code === 'Space') beginCharge();
});
document.addEventListener('keyup', event => { if (event.code === 'ArrowLeft' || event.code === 'KeyA') inputs.left = false; if (event.code === 'ArrowRight' || event.code === 'KeyD') inputs.right = false; if (event.code === 'Space') releaseCharge(); });
for (const [id, side] of [['left-control', 'left'], ['right-control', 'right'], ['launch-control', 'launch']]) {
  const button = $(id);
  button.addEventListener('pointerdown', event => { if (game.state !== 'playing') return; event.preventDefault(); button.setPointerCapture(event.pointerId); button.classList.add('pressed'); if (side === 'launch') beginCharge(); else inputs[side] = true; });
  const release = () => { button.classList.remove('pressed'); if (side === 'launch') releaseCharge(); else inputs[side] = false; };
  button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
}
window.addEventListener('blur', () => { if (game.state === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.state === 'playing') pause(); });

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-5, 5, 15, 0, .1, 100);
camera.position.set(0, 0, 30); camera.lookAt(0, 0, 0);
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
catch { $('loading').textContent = 'WebGL is unavailable. Please use a browser with hardware acceleration.'; $('start').disabled = true; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setClearColor(0, 0);
$('canvas').appendChild(renderer.domElement);
renderer.domElement.setAttribute('aria-label', 'The Night Shift pinball playfield. Use left and right arrows for flippers, hold and release Space to launch.');
scene.add(new THREE.AmbientLight(0xd5e9b5, 2));
const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-5, 10, 15); scene.add(light);
const glowLight = new THREE.PointLight(0xd8fa79, 30, 15); glowLight.position.set(0, 8, 5); scene.add(glowLight);
const materials = {
  rail: new THREE.MeshStandardMaterial({ color: 0x89956b, metalness: .7, roughness: .3 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x182111, metalness: .6, roughness: .4 }),
  lime: new THREE.MeshStandardMaterial({ color: 0xd8fa79, emissive: 0x8eb13d, emissiveIntensity: .3, metalness: .4, roughness: .25 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xf4a66c, emissive: 0xa85722, emissiveIntensity: .25, metalness: .3, roughness: .3 }),
  ball: new THREE.MeshStandardMaterial({ color: 0xf8ffe9, metalness: .8, roughness: .14 }),
};
function tube(points, radius, material) { const curve = new THREE.LineCurve3(new THREE.Vector3(...points[0]), new THREE.Vector3(...points[1])); const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 1, radius, 8, false), material); scene.add(mesh); return mesh; }
function ring(x, y, radius, color, thickness = .025, z = .05) { const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 8, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .65 })); mesh.position.set(x, y, z); scene.add(mesh); return mesh; }
function disc(x, y, radius, depth, material, z = .2) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 48), material); mesh.rotation.x = Math.PI / 2; mesh.position.set(x, y, z); scene.add(mesh); return mesh; }
// Fine printed lines give the transparent playfield a layered, screen-printed feel.
for (let x = -4; x < 4; x += .4) tube([[x, 3, -.1], [x, 13.9, -.1]], .005, new THREE.MeshBasicMaterial({ color: 0x3b4d2c }));
for (let y = 3; y < 14; y += .4) tube([[-4, y, -.1], [3.6, y, -.1]], .005, new THREE.MeshBasicMaterial({ color: 0x3b4d2c }));
WALLS.forEach(wall => tube([[wall[0], wall[1], .22], [wall[2], wall[3], .22]], .075, materials.rail));
// Inner decorative arch leaves the title clear.
const arch = [];
for (let i = 0; i <= 60; i++) { const a = Math.PI * i / 60; arch.push(new THREE.Vector3(Math.cos(a) * 3.8 - .2, 11.2 + Math.sin(a) * 2.75, .05)); }
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arch), new THREE.LineBasicMaterial({ color: 0x819857 })));
const bumperMeshes = BUMPERS.map((b, i) => {
  ring(b.x, b.y, b.r + .27, 0xb5cd79, .017); ring(b.x, b.y, b.r + .38, 0x6e854c, .012);
  disc(b.x, b.y, b.r + .1, .25, materials.dark, .23);
  const material = (i === 2 ? materials.orange : materials.lime).clone();
  const mesh = disc(b.x, b.y, b.r, .2, material, .45);
  ring(b.x, b.y, b.r - .13, 0xf1ffd7, .025, .58);
  disc(b.x, b.y, .16, .08, materials.dark, .59);
  return mesh;
});
for (const x of [-3.8, 3.05]) { for (const y of [7.2, 8.5, 9.8]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(.12, .42, .12), materials.orange); mesh.position.set(x, y, .2); mesh.rotation.z = x < 0 ? -.3 : .3; scene.add(mesh); } }
for (const [x, y] of [[-2.9, 5.3], [2.15, 5.3]]) { const shape = new THREE.Shape(); shape.moveTo(-.35, .7); shape.lineTo(.35, -.65); shape.lineTo(-.35, -.45); shape.closePath(); const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0x829b4f, transparent: true, opacity: .55 })); mesh.position.set(x, y, .04); if (x > 0) mesh.rotation.y = Math.PI; scene.add(mesh); }
for (let i = 0; i < 3; i++) { const y = 4.25 + i * .5; tube([[-.45, y, .05], [-.1, y + .18, .05]], .025, materials.lime); tube([[-.1, y + .18, .05], [.25, y, .05]], .025, materials.lime); }
ring(-.2, 7.8, 2.65, 0x536c36, .015); ring(-.2, 7.8, 2.8, 0x536c36, .009);
const flipperMeshes = {};
for (const side of ['left', 'right']) {
  const group = new THREE.Group(); const bar = new THREE.Mesh(new THREE.CapsuleGeometry(.16, 1.58, 5, 12), materials.lime); bar.rotation.z = Math.PI / 2; group.add(bar); scene.add(group); flipperMeshes[side] = group;
  const coordinates = flipper(side, false); disc(coordinates[0], coordinates[1], .24, .2, materials.dark, .3); ring(coordinates[0], coordinates[1], .23, 0xafc874, .03, .5);
}
const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), materials.ball); scene.add(ballMesh);
const ballHalo = new THREE.Mesh(new THREE.CircleGeometry(.33, 24), new THREE.MeshBasicMaterial({ color: 0xd9fba3, transparent: true, opacity: .12 })); scene.add(ballHalo);
const plunger = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .7, 12), materials.rail); plunger.position.set(4.12, .7, .3); scene.add(plunger);
function resize() { const rect = $('canvas').getBoundingClientRect(); renderer.setSize(rect.width, rect.height, false); }
new ResizeObserver(resize).observe($('canvas')); resize(); updateScore(); $('loading').hidden = true;
let last = performance.now(), accumulator = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - last) / 1000, .05); last = now; accumulator += dt;
  while (accumulator >= 1 / 180) { game.step(1 / 180, inputs); accumulator -= 1 / 180; }
  for (const side of ['left', 'right']) { const [x1, y1, x2, y2] = flipper(side, inputs[side]); const mesh = flipperMeshes[side]; mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, .4); mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1); }
  bumperMeshes.forEach((mesh, i) => { flashes[i] = Math.max(0, flashes[i] - dt * 4); mesh.material.emissiveIntensity = .3 + flashes[i] * 2; mesh.scale.setScalar(1 + flashes[i] * .07); });
  ballMesh.position.set(game.ball.x, game.ball.y, .48); ballHalo.position.set(game.ball.x, game.ball.y, .03);
  const power = charging ? Math.min(1, (now - chargeStart) / 1000) : 0;
  plunger.position.y = .65 - power * .4;
  if (charging) { $('launch-control').textContent = `POWER ${Math.round(power * 100)}%`; $('status').textContent = 'RELEASE TO LAUNCH'; }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
