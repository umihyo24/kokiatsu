"use strict";

// Every gameplay/balance number is centralized here; functions below contain rules, not tuning.
const CONFIG = Object.freeze({
  WIDTH: 960, HEIGHT: 540, WORLD_WIDTH: 3200, GROUND_Y: 455, DT_MAX: .033,
  PLAYER_W: 34, PLAYER_H: 48, PLAYER_HP: 3, PLAYER_SPEED: 220, PLAYER_ACCEL: 1500,
  PLAYER_FRICTION: 1800, JUMP_SPEED: 430, GRAVITY: 1100, MAX_X_SPEED: 430, MAX_Y_SPEED: 650,
  EXTERNAL_AIR_DRAG: 520, EXTERNAL_GROUND_DRAG: 2600, EXTERNAL_STOP_EPSILON: 6,
  INVULN: 1.05, KNOCKBACK_X: 190, KNOCKBACK_Y: 220,
  WIND_RANGE: 205, WIND_WIDTH: 118, WIND_FORCE: 2550, WIND_RECOIL: 760,
  WIND_DURATION: .14, WIND_COOLDOWN: .12, WIND_ENEMY: 1.35, WIND_PROJECTILE: 1.25,
  WIND_FOG: .44, WIND_PLAYER: 1, RECOIL_LIMIT: 2, RECOIL_RESET: .28,
  ENEMY_W: 38, ENEMY_H: 35, ENEMY_SPEED: 54, ENEMY_GRAVITY: 1050, ENEMY_MAX_SPEED: 470,
  ENEMY_MIN_X: -100, ENEMY_MAX_X: 3300, ENEMY_SPAWNS: [900, 1320, 1710],
  PROJECTILE_R: 11, PROJECTILE_SPEED: 205, PROJECTILE_MAX_SPEED: 510, PROJECTILE_LIFE: 8,
  PROJECTILE_MARGIN: 180, TURRET_X: 1880, TURRET_Y: 370, TURRET_RATE: 2.5,
  FOG_START: 1480, FOG_END: 3190, FOG_STEP_X: 92, FOG_ROWS: 4, FOG_ROW_GAP: 74,
  FOG_Y: 170, FOG_RADIUS: 76, FOG_DENSITY: .72, FOG_CORE_DENSITY: .94,
  FOG_RECOVERY: .018, FOG_CORE_RECOVERY: .028, FOG_DAMPING: .965, FOG_MIN: 0, FOG_MAX: 1,
  FOG_CLEAR: .36, FOG_ALPHA: .48, FOG_BOSS_RADIUS: 190,
  BOSS_X: 2920, BOSS_Y: 330, BOSS_R: 52, BOSS_TRIGGER: 2470, BOSS_ANOMALY: 100,
  BOSS_HIT: 25, BOSS_SHOT_RATE: 2.15, BOSS_SHOT_MIN: 1.15, BOSS_SHOT_RATE_STEP: .18,
  BOSS_CORE_HIT_R: 63, BOSS_FOG_THRESHOLD: .48, BOSS_FOG_BURST: .045,
  NORMALIZE_TIME: 3.2, NORMALIZE_FADE: .36, CAMERA_LEAD: 220, CAMERA_LERP: .09,
  PARTICLE_LIFE: .65, PARTICLE_COUNT: 16, PARTICLE_SPEED: 130, PARTICLE_GRAVITY: 80,
  PLATFORM_COLOR: "#263e4b", HUD_PAD: 20, UI_BAR_W: 250, UI_BAR_H: 14,
  HINT_FADE_DISTANCE: 270, START_X: 90, START_Y: 390,
  HINTS: [
    [120, "← → で移動 / Z でジャンプ"], [520, "X + 方向キー：風で物体を押す"],
    [980, "空中で X：風と逆向きに反動"], [1450, "軽い敵は風で場外へ"],
    [1840, "弾は風で軌道を変えられる"], [2200, "霧を繰り返し吹き払い、先へ"],
    [2670, "核の霧を晴らし、敵弾を反射せよ"]
  ]
});

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
canvas.width = CONFIG.WIDTH; canvas.height = CONFIG.HEIGHT;

// Required compatible asset convention. Missing files are intentionally harmless.
function createImage(key) {
  const image = new Image();
  const path = key.startsWith("cards.")
    ? `assets/cards/${key.slice("cards.".length)}.png`
    : `assets/monsters/${key.slice("monsters.".length)}.png`;
  image.loadedSuccessfully = false;
  image.addEventListener("load", () => { image.loadedSuccessfully = image.naturalWidth > 0 && image.naturalHeight > 0; });
  image.addEventListener("error", () => { image.loadedSuccessfully = false; });
  image.src = path;
  return image;
}
const ASSETS = Object.freeze({
  light: createImage("monsters.monster_fog_light_move"),
  boss: createImage("monsters.monster_fog_boss_idle"),
  wind: createImage("cards.card_wind_player_cast"),
  fog: createImage("cards.card_fog_world_effect")
});
function drawable(image) { return Boolean(image?.loadedSuccessfully && image.naturalWidth > 0 && image.naturalHeight > 0); }
const clamp = (value, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;
const overlaps = (a, b) => a?.x < b?.x + b?.w && a?.x + a?.w > b?.x && a?.y < b?.y + b?.h && a?.y + a?.h > b?.y;
const circleRect = (c, r) => {
  if (!c || !r) return false;
  const nx = clamp(c.x, r.x, r.x + r.w), ny = clamp(c.y, r.y, r.y + r.h);
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 < c.r ** 2;
};

function makeFog() {
  const cells = [];
  for (let x = CONFIG.FOG_START; x <= CONFIG.FOG_END; x += CONFIG.FOG_STEP_X) {
    for (let row = 0; row < CONFIG.FOG_ROWS; row += 1) {
      const core = Math.abs(x - CONFIG.BOSS_X) < CONFIG.FOG_BOSS_RADIUS;
      cells.push({ x, homeX: x, y: CONFIG.FOG_Y + row * CONFIG.FOG_ROW_GAP, homeY: CONFIG.FOG_Y + row * CONFIG.FOG_ROW_GAP,
        vx: 0, vy: 0, density: core ? CONFIG.FOG_CORE_DENSITY : CONFIG.FOG_DENSITY, baseDensity: core ? CONFIG.FOG_CORE_DENSITY : CONFIG.FOG_DENSITY, core });
    }
  }
  return cells;
}
function createGameState(phase = "start") {
  return {
    phase, result: null, time: 0, camera: { x: 0 },
    input: { keys: {}, pressed: {}, windActive: 0, windCooldown: 0, windDir: { x: 1, y: 0 } },
    player: { x: CONFIG.START_X, y: CONFIG.START_Y, w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H,
      moveVx: 0, externalVx: 0, vx: 0, vy: 0,
      hp: CONFIG.PLAYER_HP, facing: 1, grounded: false, invuln: 0, recoilCount: 0, recoilReset: 0 },
    stage: { turretTimer: CONFIG.TURRET_RATE, hints: CONFIG.HINTS, bossEntered: false, normalizedTimer: 0 },
    boss: { x: CONFIG.BOSS_X, y: CONFIG.BOSS_Y, r: CONFIG.BOSS_R, anomaly: CONFIG.BOSS_ANOMALY, shotTimer: CONFIG.BOSS_SHOT_RATE, active: false },
    enemies: CONFIG.ENEMY_SPAWNS.map((x, i) => ({ x, y: CONFIG.GROUND_Y - CONFIG.ENEMY_H, w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H, vx: i % 2 ? -CONFIG.ENEMY_SPEED : CONFIG.ENEMY_SPEED, vy: 0, alive: true })),
    projectiles: [], fogCells: makeFog(), particles: []
  };
}
let gameState = createGameState();

const GAMEPLAY_KEYS = Object.freeze({
  ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down",
  KeyZ: "jump", KeyX: "wind", Enter: "enter"
});
function inputKey(event) {
  return GAMEPLAY_KEYS[event?.code] ?? "";
}
addEventListener("keydown", event => {
  const key = inputKey(event);
  if (!key) return;
  event.preventDefault();
  if (!gameState.input.keys[key]) gameState.input.pressed[key] = true;
  gameState.input.keys[key] = true;
});
addEventListener("keyup", event => {
  const key = inputKey(event);
  if (!key) return;
  event.preventDefault();
  gameState.input.keys[key] = false;
});
function clearActiveInput() {
  gameState.input.keys = {};
  gameState.input.pressed = {};
}
addEventListener("blur", clearActiveInput);
document.addEventListener("visibilitychange", () => { if (document.hidden) clearActiveInput(); });

// Convert raw key state once per frame so movement and wind share one interpretation.
function interpretInput() {
  const keys = gameState.input.keys;
  const left = Boolean(keys.left), right = Boolean(keys.right);
  const up = Boolean(keys.up), down = Boolean(keys.down);
  const movementX = left === right ? 0 : right ? 1 : -1;
  // Opposing vertical inputs cancel; horizontal input/facing then determines wind.
  const windY = up === down ? 0 : up ? -1 : 1;
  return {
    movementX,
    jumpPressed: Boolean(gameState.input.pressed.jump),
    windHeld: Boolean(keys.wind),
    windDirection: windY ? { x: 0, y: windY } : { x: movementX || gameState.player.facing, y: 0 }
  };
}
function inWindRegion(object, dir) {
  const p = gameState.player;
  const ox = object.x + (object.w ?? 0) / 2 - (p.x + p.w / 2);
  const oy = object.y + (object.h ?? 0) / 2 - (p.y + p.h / 2);
  const forward = ox * dir.x + oy * dir.y, side = Math.abs(ox * -dir.y + oy * dir.x);
  return forward >= 0 && forward <= CONFIG.WIND_RANGE && side <= CONFIG.WIND_WIDTH / 2;
}
// One reusable interaction path for every wind-responsive body.
function applyWind(object, response, dt, dir = gameState.input.windDir) {
  if (!object || !inWindRegion(object, dir)) return false;
  object.vx = clamp((object.vx ?? 0) + dir.x * CONFIG.WIND_FORCE * response * dt, -CONFIG.PROJECTILE_MAX_SPEED, CONFIG.PROJECTILE_MAX_SPEED);
  object.vy = clamp((object.vy ?? 0) + dir.y * CONFIG.WIND_FORCE * response * dt, -CONFIG.MAX_Y_SPEED, CONFIG.MAX_Y_SPEED);
  return true;
}
function beginWind(direction) {
  const input = gameState.input, player = gameState.player;
  input.windActive = CONFIG.WIND_DURATION; input.windCooldown = CONFIG.WIND_COOLDOWN; input.windDir = direction;
  if (!player.grounded && player.recoilCount < CONFIG.RECOIL_LIMIT) {
    player.externalVx = clamp(player.externalVx - input.windDir.x * CONFIG.WIND_RECOIL, -CONFIG.MAX_X_SPEED, CONFIG.MAX_X_SPEED);
    player.vy -= input.windDir.y * CONFIG.WIND_RECOIL;
    player.recoilCount += 1; player.recoilReset = CONFIG.RECOIL_RESET;
  }
}
function damagePlayer(sourceX) {
  const p = gameState.player;
  if (p.invuln > 0 || gameState.result) return;
  p.hp = clamp(p.hp - 1, 0, CONFIG.PLAYER_HP); p.invuln = CONFIG.INVULN;
  p.externalVx = p.x < sourceX ? -CONFIG.KNOCKBACK_X : CONFIG.KNOCKBACK_X; p.vy = -CONFIG.KNOCKBACK_Y;
  if (p.hp === 0) { gameState.phase = "gameover"; gameState.result = "defeated"; }
}
function updatePlayer(dt, controls) {
  const p = gameState.player;
  if (controls.movementX) { p.moveVx += controls.movementX * CONFIG.PLAYER_ACCEL * dt; p.facing = controls.movementX; }
  else { const drag = CONFIG.PLAYER_FRICTION * dt; p.moveVx = Math.abs(p.moveVx) <= drag ? 0 : p.moveVx - Math.sign(p.moveVx) * drag; }
  p.moveVx = clamp(p.moveVx, -CONFIG.PLAYER_SPEED, CONFIG.PLAYER_SPEED);
  const externalDrag = (p.grounded ? CONFIG.EXTERNAL_GROUND_DRAG : CONFIG.EXTERNAL_AIR_DRAG) * dt;
  p.externalVx = Math.abs(p.externalVx) <= Math.max(externalDrag, CONFIG.EXTERNAL_STOP_EPSILON)
    ? 0 : p.externalVx - Math.sign(p.externalVx) * externalDrag;
  if (controls.jumpPressed && p.grounded) { p.vy = -CONFIG.JUMP_SPEED; p.grounded = false; }
  p.vy += CONFIG.GRAVITY * dt; p.vx = clamp(p.moveVx + p.externalVx, -CONFIG.MAX_X_SPEED, CONFIG.MAX_X_SPEED); p.vy = clamp(p.vy, -CONFIG.MAX_Y_SPEED, CONFIG.MAX_Y_SPEED);
  p.x = clamp(p.x + p.vx * dt, 0, CONFIG.WORLD_WIDTH - p.w); p.y += p.vy * dt;
  if (p.y + p.h >= CONFIG.GROUND_Y) { p.y = CONFIG.GROUND_Y - p.h; p.vy = 0; p.grounded = true; p.recoilCount = 0; }
  else p.grounded = false;
  p.invuln = Math.max(0, p.invuln - dt); p.recoilReset = Math.max(0, p.recoilReset - dt);
  if (p.recoilReset === 0 && p.recoilCount > 0) p.recoilCount -= 1;
}
function updateEnemies(dt) {
  for (const enemy of gameState.enemies) {
    if (!enemy?.alive) continue;
    enemy.vy += CONFIG.ENEMY_GRAVITY * dt;
    if (gameState.input.windActive > 0) applyWind(enemy, CONFIG.WIND_ENEMY, dt);
    enemy.vx = clamp(enemy.vx, -CONFIG.ENEMY_MAX_SPEED, CONFIG.ENEMY_MAX_SPEED);
    enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt;
    if (enemy.y + enemy.h >= CONFIG.GROUND_Y) { enemy.y = CONFIG.GROUND_Y - enemy.h; enemy.vy = 0; }
    if (overlaps(gameState.player, enemy)) damagePlayer(enemy.x);
    enemy.alive = enemy.x > CONFIG.ENEMY_MIN_X && enemy.x < CONFIG.ENEMY_MAX_X;
  }
}
function spawnProjectile(x, y, targetX, targetY, bossShot) {
  const dx = targetX - x, dy = targetY - y, length = Math.hypot(dx, dy) || 1;
  gameState.projectiles.push({ x, y, r: CONFIG.PROJECTILE_R, vx: dx / length * CONFIG.PROJECTILE_SPEED,
    vy: dy / length * CONFIG.PROJECTILE_SPEED, life: CONFIG.PROJECTILE_LIFE, hostile: true, reflected: false, bossShot });
}
function localCoreFog() {
  const nearby = gameState.fogCells.filter(cell => cell && Math.hypot(cell.x - CONFIG.BOSS_X, cell.y - CONFIG.BOSS_Y) < CONFIG.FOG_BOSS_RADIUS);
  return nearby.length ? nearby.reduce((sum, cell) => sum + cell.density, 0) / nearby.length : CONFIG.FOG_MIN;
}
function updateProjectiles(dt) {
  const boss = gameState.boss;
  for (const shot of gameState.projectiles) {
    if (!shot || shot.life <= 0) continue;
    if (gameState.input.windActive > 0 && applyWind(shot, CONFIG.WIND_PROJECTILE, dt)) { shot.reflected = true; shot.hostile = false; }
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    if (shot.hostile && circleRect(shot, gameState.player)) { damagePlayer(shot.x); shot.life = 0; }
    if (boss.active && shot.reflected && Math.hypot(shot.x - boss.x, shot.y - boss.y) < CONFIG.BOSS_CORE_HIT_R && localCoreFog() < CONFIG.BOSS_FOG_THRESHOLD) {
      boss.anomaly = clamp(boss.anomaly - CONFIG.BOSS_HIT, 0, CONFIG.BOSS_ANOMALY); shot.life = 0;
      for (let i = 0; i < CONFIG.PARTICLE_COUNT; i += 1) {
        const angle = i / CONFIG.PARTICLE_COUNT * Math.PI * 2;
        gameState.particles.push({ x: boss.x, y: boss.y, vx: Math.cos(angle) * CONFIG.PARTICLE_SPEED, vy: Math.sin(angle) * CONFIG.PARTICLE_SPEED, life: CONFIG.PARTICLE_LIFE });
      }
    }
  }
}
function updateFog(dt) {
  const normalized = gameState.boss.anomaly === 0;
  for (const cell of gameState.fogCells) {
    if (!cell) continue;
    if (gameState.input.windActive > 0 && applyWind(cell, CONFIG.WIND_FOG, dt)) cell.density -= CONFIG.FOG_CLEAR * dt / CONFIG.WIND_DURATION;
    cell.x += cell.vx * dt; cell.y += cell.vy * dt; cell.vx *= CONFIG.FOG_DAMPING; cell.vy *= CONFIG.FOG_DAMPING;
    const recovery = cell.core ? CONFIG.FOG_CORE_RECOVERY : CONFIG.FOG_RECOVERY;
    const target = normalized ? CONFIG.FOG_MIN : cell.baseDensity * (gameState.boss.anomaly / CONFIG.BOSS_ANOMALY);
    cell.density += (target - cell.density) * recovery * dt;
    cell.density = clamp(cell.density - (normalized ? CONFIG.NORMALIZE_FADE * dt : 0), CONFIG.FOG_MIN, CONFIG.FOG_MAX);
    cell.x += (cell.homeX - cell.x) * recovery * dt; cell.y += (cell.homeY - cell.y) * recovery * dt;
  }
}
function updateBoss(dt) {
  const state = gameState, boss = state.boss, p = state.player;
  if (!boss.active && p.x >= CONFIG.BOSS_TRIGGER) { boss.active = true; state.stage.bossEntered = true; }
  if (!state.result && state.stage.turretTimer <= 0 && p.x > CONFIG.TURRET_X - CONFIG.WIND_RANGE && !boss.active) {
    spawnProjectile(CONFIG.TURRET_X, CONFIG.TURRET_Y, p.x, p.y, false); state.stage.turretTimer = CONFIG.TURRET_RATE;
  }
  state.stage.turretTimer -= dt;
  if (boss.active && boss.anomaly > 0) {
    boss.shotTimer -= dt;
    if (boss.shotTimer <= 0) {
      spawnProjectile(boss.x, boss.y, p.x + p.w / 2, p.y + p.h / 2, true);
      boss.shotTimer = Math.max(CONFIG.BOSS_SHOT_MIN, CONFIG.BOSS_SHOT_RATE - (CONFIG.BOSS_ANOMALY - boss.anomaly) / CONFIG.BOSS_HIT * CONFIG.BOSS_SHOT_RATE_STEP);
      for (const cell of state.fogCells) if (cell?.core) cell.density = clamp(cell.density + CONFIG.BOSS_FOG_BURST, CONFIG.FOG_MIN, CONFIG.FOG_MAX);
    }
  }
  if (boss.anomaly === 0 && !state.result) {
    state.stage.normalizedTimer += dt;
    if (state.stage.normalizedTimer >= CONFIG.NORMALIZE_TIME) { state.phase = "gameover"; state.result = "normalized"; }
  }
}
function updateParticles(dt) {
  for (const particle of gameState.particles) if (particle) { particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.vy += CONFIG.PARTICLE_GRAVITY * dt; particle.life -= dt; }
}
function update(rawDt) {
  const dt = clamp(rawDt, 0, CONFIG.DT_MAX);
  let state = gameState;
  if (state.input.pressed.enter && (state.phase === "start" || state.phase === "gameover")) state = gameState = createGameState("playing");
  if (state.phase !== "playing") { state.input.pressed = {}; return; }
  const controls = interpretInput();
  state.time += dt; state.input.windCooldown = Math.max(0, state.input.windCooldown - dt); state.input.windActive = Math.max(0, state.input.windActive - dt);
  if (controls.windHeld && state.input.windCooldown === 0) beginWind(controls.windDirection);
  updatePlayer(dt, controls); updateEnemies(dt); updateProjectiles(dt); updateFog(dt); updateBoss(dt); updateParticles(dt);
  state.enemies = state.enemies.filter(enemy => enemy?.alive);
  state.projectiles = state.projectiles.filter(shot => shot && shot.life > 0 && shot.x > -CONFIG.PROJECTILE_MARGIN && shot.x < CONFIG.WORLD_WIDTH + CONFIG.PROJECTILE_MARGIN && shot.y > -CONFIG.PROJECTILE_MARGIN && shot.y < CONFIG.HEIGHT + CONFIG.PROJECTILE_MARGIN);
  state.particles = state.particles.filter(particle => particle && particle.life > 0);
  const targetCamera = clamp(state.player.x - CONFIG.CAMERA_LEAD, 0, CONFIG.WORLD_WIDTH - CONFIG.WIDTH);
  state.camera.x += (targetCamera - state.camera.x) * CONFIG.CAMERA_LERP;
  state.input.pressed = {};
}

function drawAsset(image, x, y, w, h, fallback) { if (drawable(image)) ctx.drawImage(image, x, y, w, h); else fallback(); }
function renderBackground() {
  const clarity = 1 - gameState.boss.anomaly / CONFIG.BOSS_ANOMALY;
  const sky = ctx.createLinearGradient(0, 0, 0, CONFIG.HEIGHT); sky.addColorStop(0, `rgb(${36 + clarity * 85},${57 + clarity * 105},${76 + clarity * 130})`); sky.addColorStop(1, "#8bb5bd"); ctx.fillStyle = sky; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
  ctx.save(); ctx.translate(-gameState.camera.x * .25, 0); ctx.fillStyle = `rgba(210,235,238,${.2 + clarity * .55})`;
  for (let x = 0; x < CONFIG.WORLD_WIDTH; x += 310) { ctx.fillRect(x, 335, 190, 120); ctx.beginPath(); ctx.moveTo(x + 18, 335); ctx.lineTo(x + 95, 270); ctx.lineTo(x + 172, 335); ctx.fill(); }
  ctx.fillStyle = `rgba(47,116,148,${.3 + clarity * .5})`; ctx.fillRect(0, 420, CONFIG.WORLD_WIDTH, 80); ctx.restore();
}
function renderWorld() {
  const cam = gameState.camera.x; ctx.save(); ctx.translate(-cam, 0);
  ctx.fillStyle = CONFIG.PLATFORM_COLOR; ctx.fillRect(0, CONFIG.GROUND_Y, CONFIG.WORLD_WIDTH, CONFIG.HEIGHT - CONFIG.GROUND_Y);
  ctx.fillStyle = "#395c68"; for (let x = 0; x < CONFIG.WORLD_WIDTH; x += 80) ctx.fillRect(x, CONFIG.GROUND_Y, 58, 7);
  ctx.fillStyle = "#547987"; ctx.fillRect(CONFIG.TURRET_X - 15, CONFIG.TURRET_Y, 30, CONFIG.GROUND_Y - CONFIG.TURRET_Y);
  for (const enemy of gameState.enemies) if (enemy) drawAsset(ASSETS.light, enemy.x, enemy.y, enemy.w, enemy.h, () => { ctx.fillStyle = "#ad78bd"; ctx.beginPath(); ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(enemy.x + 8, enemy.y + 11, 6, 6); });
  const boss = gameState.boss;
  if (boss.active || gameState.player.x > CONFIG.BOSS_TRIGGER - CONFIG.WIDTH) drawAsset(ASSETS.boss, boss.x - boss.r, boss.y - boss.r, boss.r * 2, boss.r * 2, () => { ctx.fillStyle = localCoreFog() < CONFIG.BOSS_FOG_THRESHOLD ? "#ffd866" : "#6c748a"; ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#eafcff"; ctx.lineWidth = 5; ctx.stroke(); });
  for (const shot of gameState.projectiles) if (shot) { ctx.fillStyle = shot.reflected ? "#78f4ff" : "#ff7292"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  const p = gameState.player; if (p.invuln <= 0 || Math.floor(gameState.time * 12) % 2 === 0) { ctx.fillStyle = "#f5fbff"; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = "#2dcbe4"; ctx.fillRect(p.x + (p.facing > 0 ? 21 : 5), p.y + 12, 8, 8); ctx.fillStyle = "#efb94b"; ctx.fillRect(p.x + 7, p.y + 31, 20, 6); }
  for (const particle of gameState.particles) if (particle) { ctx.globalAlpha = clamp(particle.life / CONFIG.PARTICLE_LIFE, 0, 1); ctx.fillStyle = "#fff2a0"; ctx.fillRect(particle.x, particle.y, 5, 5); } ctx.globalAlpha = 1;
  if (gameState.input.windActive > 0) { const d = gameState.input.windDir, cx = p.x + p.w / 2, cy = p.y + p.h / 2; ctx.strokeStyle = "#a8f5ff"; ctx.lineWidth = 5; ctx.lineCap = "round"; for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(cx - d.y * i * 22, cy + d.x * i * 22); ctx.lineTo(cx + d.x * CONFIG.WIND_RANGE - d.y * i * 22, cy + d.y * CONFIG.WIND_RANGE + d.x * i * 22); ctx.stroke(); } }
  for (const cell of gameState.fogCells) if (cell?.density > 0) { ctx.globalAlpha = cell.density * CONFIG.FOG_ALPHA; ctx.fillStyle = "#d6e1e4"; ctx.beginPath(); ctx.arc(cell.x, cell.y, CONFIG.FOG_RADIUS, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.restore();
}
function renderUI() {
  ctx.fillStyle = "#07131dcc"; ctx.fillRect(CONFIG.HUD_PAD, CONFIG.HUD_PAD, CONFIG.UI_BAR_W + 20, 76); ctx.fillStyle = "#fff"; ctx.font = "bold 18px system-ui"; ctx.fillText(`HP ${"◆".repeat(gameState.player.hp)}${"◇".repeat(CONFIG.PLAYER_HP - gameState.player.hp)}`, 32, 48); ctx.fillText(`Weather Anomaly ${gameState.boss.anomaly}%`, 32, 78);
  ctx.fillStyle = "#213544"; ctx.fillRect(300, 25, CONFIG.UI_BAR_W, CONFIG.UI_BAR_H); ctx.fillStyle = gameState.boss.anomaly > 50 ? "#d98ba7" : "#77d9e6"; ctx.fillRect(300, 25, CONFIG.UI_BAR_W * gameState.boss.anomaly / CONFIG.BOSS_ANOMALY, CONFIG.UI_BAR_H);
  if (gameState.phase === "playing") { let nearest = null, distance = Infinity; for (const hint of gameState.stage.hints) { const d = Math.abs(gameState.player.x - hint[0]); if (d < distance) { distance = d; nearest = hint; } } if (nearest && distance < CONFIG.HINT_FADE_DISTANCE) { ctx.textAlign = "center"; ctx.font = "bold 19px system-ui"; ctx.fillStyle = "#07131dcc"; ctx.fillRect(235, 475, 490, 42); ctx.fillStyle = "#effcff"; ctx.fillText(nearest[1], 480, 503); ctx.textAlign = "left"; } }
  if (gameState.boss.active && gameState.boss.anomaly > 0) { ctx.textAlign = "center"; ctx.fillStyle = localCoreFog() < CONFIG.BOSS_FOG_THRESHOLD ? "#fff2a0" : "#e4edf0"; ctx.fillText(localCoreFog() < CONFIG.BOSS_FOG_THRESHOLD ? "CORE EXPOSED — 反射弾を当てろ！" : "核周辺の霧を風で晴らせ", 480, 70); ctx.textAlign = "left"; }
}
function renderOverlay() {
  if (gameState.phase === "playing") return;
  ctx.fillStyle = "#06131dcc"; ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT); ctx.textAlign = "center"; ctx.fillStyle = "#effcff"; ctx.font = "bold 34px system-ui";
  const title = gameState.phase === "start" ? "Weather Normalization Action Game" : gameState.result === "normalized" ? "WEATHER NORMALIZED" : "LOST IN THE FOG"; ctx.fillText(title, CONFIG.WIDTH / 2, 205);
  ctx.font = "20px system-ui"; ctx.fillStyle = gameState.result === "normalized" ? "#aaf8dc" : "#c6eaf5"; ctx.fillText(gameState.phase === "start" ? "Prototype 01: Fog" : gameState.result === "normalized" ? "港に青空と穏やかな風が戻った" : "気象異常に飲み込まれた", CONFIG.WIDTH / 2, 250); ctx.fillStyle = "#fff"; ctx.fillText("Enter を押して開始 / リトライ", CONFIG.WIDTH / 2, 310); ctx.textAlign = "left";
}
function render() { ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT); renderBackground(); renderWorld(); renderUI(); renderOverlay(); }

let previous = performance.now();
function frame(now) { const dt = (now - previous) / 1000; previous = now; update(dt); render(); requestAnimationFrame(frame); }
requestAnimationFrame(frame);
