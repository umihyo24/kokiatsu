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
  FOG_ANCHOR: Object.freeze({
    ID: "fog-anchor-encounter", START_X: 2450, WIDTH: 64, HEIGHT: 70,
    NORMAL_WIND_RESPONSE: .045, STAGGERED_WIND_RESPONSE: .92,
    STAGGER_DURATION: 5.5, PROJECTILE_INTERVAL: 2.8, MAX_HORIZONTAL_VELOCITY: 185,
    DRAG: 210, CONTACT_DAMAGE: 1, ACTIVATION_RANGE: 520,
    PROJECTILE_OFFSET_X: 8, PROJECTILE_OFFSET_Y: 24,
    ZONE_X: 2580, ZONE_Y: 365, ZONE_WIDTH: 125, ZONE_HEIGHT: 90,
    PARTICLE_COUNT: 20, FEEDBACK_TIME: .7, VIBRATION_DISTANCE: 3,
    GROUND_MARK_WIDTH: 82, GROUND_MARK_HEIGHT: 10, STREAK_LENGTH: 30, STREAK_GAP: 18,
    VIBRATION_RATE: 28, SPIKE_COUNT: 4, ZONE_LINE_WIDTH: 4
  }),
  PROJECTILE_R: 11, PROJECTILE_SPEED: 205, PROJECTILE_MAX_SPEED: 510, PROJECTILE_LIFE: 8,
  PROJECTILE_MARGIN: 180, TURRET_X: 1880, TURRET_Y: 370, TURRET_RATE: 2.5,
  FOG_START: 1310, FOG_END: 3190, FOG_STEP_X: 92, FOG_ROWS: 4, FOG_ROW_GAP: 74,
  FOG_Y: 170, FOG_RADIUS: 76, FOG_DENSITY: .72, FOG_CORE_DENSITY: .94,
  FOG_RECOVERY: .018, FOG_CORE_RECOVERY: .028, FOG_DAMPING: .965, FOG_MIN: 0, FOG_MAX: 1,
  FOG_CLEAR: .12, FOG_ALPHA: .48, FOG_BOSS_RADIUS: 190,
  SEARCHLIGHT: Object.freeze({
    X: 1448, Y: 72, DIRECTION_X: 0, DIRECTION_Y: 1,
    BEAM_RANGE: 383, BEAM_WIDTH: 34, DAMAGE: 1, FOG_BLOCK_THRESHOLD: .58,
    HIT_COOLDOWN: 1.05, COLOR: "#fff3a6", ALPHA: .62, SAMPLE_STEP: 18,
    FOG_SAMPLE_RADIUS: 32, EMITTER_RADIUS: 22, EMITTER_LENGTH: 34,
    BLOCK_GLOW_RADIUS: 30, BLOCK_GLOW_ALPHA: .82, BEAM_EDGE_WIDTH: 3,
    SOURCE_MIN_X: 1300, SOURCE_MAX_X: 1410, SOURCE_RECOVERY: .075,
    SOURCE_MIN_DENSITY: .68
  }),
  BUOY: Object.freeze({
    START_X: 2110, START_Y: 395, WIDTH: 86, HEIGHT: 30,
    WIND_RESPONSE: .52, MAX_SPEED_X: 125, MAX_SPEED_Y: 72, DRAG: 72,
    VERTICAL_DRAG: 135, FLOAT_RETURN: 7.5, MIN_Y: 350, MAX_Y: 425,
    WORLD_MIN_X: 1960, WORLD_MAX_X: 2435, LAND_TOLERANCE: 8,
    FOG_SUPPRESSION_RADIUS: 185, FOG_RECOVERY_MULTIPLIER: .3,
    SUPPRESSION_MIN_DENSITY: .18, FEEDBACK_TIME: .22, BLOCK_PARTICLES: 7,
    TILT_MAX: .11, STREAK_LENGTH: 24, STREAK_GAP: 14, INDICATOR_ALPHA: .2
  }),
  BOSS_X: 2920, BOSS_Y: 330, BOSS_R: 52, BOSS_TRIGGER: 2720, BOSS_ANOMALY: 100,
  BOSS_HIT: 25, BOSS_SHOT_RATE: 2.15, BOSS_SHOT_MIN: 1.15, BOSS_SHOT_RATE_STEP: .18,
  BOSS_CORE_HIT_R: 63, BOSS_FOG_THRESHOLD: .48, BOSS_FOG_BURST: .045,
  NORMALIZE_TIME: 3.2, NORMALIZE_FADE: .36, CAMERA_LEAD: 220, CAMERA_LERP: .09,
  PARTICLE_LIFE: .65, PARTICLE_COUNT: 16, PARTICLE_SPEED: 130, PARTICLE_GRAVITY: 80,
  PLATFORM_COLOR: "#263e4b", HUD_PAD: 20, UI_BAR_W: 250, UI_BAR_H: 14,
  HINT_FADE_DISTANCE: 270, START_X: 90, START_Y: 390,
  HINTS: [
    [120, "← → で移動 / Z でジャンプ"], [520, "X + 方向キー：風で物体を押す"],
    [980, "空中で X：風と逆向きに反動"], [1450, "軽い敵は風で場外へ"],
    [1260, "光は風で動かない — 霧を遮蔽物に"],
    [1840, "弾は風で軌道を変えられる"], [2070, "風で観測ブイを霧の航路へ"],
    [2320, "ブイを足場にし、残る霧は風で晴らす"],
    [2490, "返した弾で錨を浮かせ、格納区画へ"],
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
  fog: createImage("cards.card_fog_world_effect"),
  buoy: createImage("cards.weather_fog_local_observe"),
  anchorIdle: createImage("monsters.monster_fog_heavy_idle"),
  anchorStagger: createImage("monsters.monster_fog_heavy_stagger"),
  searchlight: createImage("cards.card_light_world_searchlight")
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
      cells.push({ type: "fog", windResponseMultiplier: CONFIG.WIND_FOG, x, homeX: x, y: CONFIG.FOG_Y + row * CONFIG.FOG_ROW_GAP, homeY: CONFIG.FOG_Y + row * CONFIG.FOG_ROW_GAP,
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
      hp: CONFIG.PLAYER_HP, facing: 1, grounded: false, standingWindObject: null,
      invuln: 0, recoilCount: 0, recoilReset: 0 },
    stage: { turretTimer: CONFIG.TURRET_RATE, hints: CONFIG.HINTS, bossEntered: false, normalizedTimer: 0,
      anchorNeutralized: false, anchorFeedbackTimer: 0 },
    boss: { x: CONFIG.BOSS_X, y: CONFIG.BOSS_Y, r: CONFIG.BOSS_R, anomaly: CONFIG.BOSS_ANOMALY, shotTimer: CONFIG.BOSS_SHOT_RATE, active: false },
    enemies: [
      ...CONFIG.ENEMY_SPAWNS.map((x, i) => ({ type: "lightweight", windResponseMultiplier: CONFIG.WIND_ENEMY,
        x, y: CONFIG.GROUND_Y - CONFIG.ENEMY_H, w: CONFIG.ENEMY_W, h: CONFIG.ENEMY_H,
        vx: i % 2 ? -CONFIG.ENEMY_SPEED : CONFIG.ENEMY_SPEED, vy: 0, active: true })),
      { id: CONFIG.FOG_ANCHOR.ID, type: "fogAnchor", x: CONFIG.FOG_ANCHOR.START_X,
        y: CONFIG.GROUND_Y - CONFIG.FOG_ANCHOR.HEIGHT, w: CONFIG.FOG_ANCHOR.WIDTH,
        h: CONFIG.FOG_ANCHOR.HEIGHT, vx: 0, vy: 0, active: true, state: "anchored",
        staggerTimer: 0, shootTimer: CONFIG.FOG_ANCHOR.PROJECTILE_INTERVAL,
        windResponseMultiplier: CONFIG.FOG_ANCHOR.NORMAL_WIND_RESPONSE }
    ],
    windObjects: [{ type: "observationBuoy", x: CONFIG.BUOY.START_X, y: CONFIG.BUOY.START_Y,
      vx: 0, vy: 0, width: CONFIG.BUOY.WIDTH, height: CONFIG.BUOY.HEIGHT,
      grounded: true, active: true, dx: 0, dy: 0, windFeedback: 0,
      windResponseMultiplier: CONFIG.BUOY.WIND_RESPONSE }],
    hazards: [{ type: "searchlight", x: CONFIG.SEARCHLIGHT.X, y: CONFIG.SEARCHLIGHT.Y,
      directionX: CONFIG.SEARCHLIGHT.DIRECTION_X, directionY: CONFIG.SEARCHLIGHT.DIRECTION_Y,
      active: true, beamEndX: CONFIG.SEARCHLIGHT.X, beamEndY: CONFIG.GROUND_Y, blockedByFog: false }],
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
function applyWind(object, dt, dir = gameState.input.windDir) {
  if (!object || !inWindRegion(object, dir)) return false;
  const response = Number.isFinite(object.windResponseMultiplier) ? object.windResponseMultiplier : 0;
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
function damagePlayer(sourceX, amount = 1, cooldown = CONFIG.INVULN) {
  const p = gameState.player;
  if (p.invuln > 0 || gameState.result) return;
  p.hp = clamp(p.hp - amount, 0, CONFIG.PLAYER_HP); p.invuln = cooldown;
  p.externalVx = p.x < sourceX ? -CONFIG.KNOCKBACK_X : CONFIG.KNOCKBACK_X; p.vy = -CONFIG.KNOCKBACK_Y;
  if (p.hp === 0) { gameState.phase = "gameover"; gameState.result = "defeated"; }
}
function updateWindObjects(dt) {
  for (const object of gameState.windObjects) {
    if (!object?.active || object.type !== "observationBuoy") continue;
    const previousX = object.x, previousY = object.y;
    if (gameState.input.windActive > 0 && applyWind(object, dt)) {
      object.windFeedback = CONFIG.BUOY.FEEDBACK_TIME;
      object.grounded = false;
    }
    const horizontalDrag = CONFIG.BUOY.DRAG * dt;
    object.vx = Math.abs(object.vx) <= horizontalDrag ? 0 : object.vx - Math.sign(object.vx) * horizontalDrag;
    object.vy += (CONFIG.BUOY.START_Y - object.y) * CONFIG.BUOY.FLOAT_RETURN * dt;
    const verticalDrag = CONFIG.BUOY.VERTICAL_DRAG * dt;
    object.vy = Math.abs(object.vy) <= verticalDrag ? 0 : object.vy - Math.sign(object.vy) * verticalDrag;
    object.vx = clamp(object.vx, -CONFIG.BUOY.MAX_SPEED_X, CONFIG.BUOY.MAX_SPEED_X);
    object.vy = clamp(object.vy, -CONFIG.BUOY.MAX_SPEED_Y, CONFIG.BUOY.MAX_SPEED_Y);
    object.x = clamp(object.x + object.vx * dt, CONFIG.BUOY.WORLD_MIN_X, CONFIG.BUOY.WORLD_MAX_X - object.width);
    object.y = clamp(object.y + object.vy * dt, CONFIG.BUOY.MIN_Y, CONFIG.BUOY.MAX_Y);
    if ((object.x === CONFIG.BUOY.WORLD_MIN_X && object.vx < 0) ||
        (object.x === CONFIG.BUOY.WORLD_MAX_X - object.width && object.vx > 0)) object.vx = 0;
    if ((object.y === CONFIG.BUOY.MIN_Y && object.vy < 0) || (object.y === CONFIG.BUOY.MAX_Y && object.vy > 0)) object.vy = 0;
    object.dx = object.x - previousX;
    object.dy = object.y - previousY;
    object.grounded = Math.abs(object.y - CONFIG.BUOY.START_Y) <= CONFIG.BUOY.LAND_TOLERANCE;
    object.windFeedback = Math.max(0, object.windFeedback - dt);
  }
}
function updatePlayer(dt, controls) {
  const p = gameState.player;
  const support = Number.isInteger(p.standingWindObject) ? gameState.windObjects[p.standingWindObject] : null;
  if (support?.active) { p.x = clamp(p.x + support.dx, 0, CONFIG.WORLD_WIDTH - p.w); p.y += support.dy; }
  else p.standingWindObject = null;
  const previousBottom = p.y + p.h;
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
  else {
    p.grounded = false; p.standingWindObject = null;
    for (let i = 0; i < gameState.windObjects.length; i += 1) {
      const object = gameState.windObjects[i];
      if (!object?.active) continue;
      const top = object.y, horizontal = p.x + p.w > object.x && p.x < object.x + object.width;
      if (p.vy >= 0 && horizontal && previousBottom <= top + CONFIG.BUOY.LAND_TOLERANCE && p.y + p.h >= top) {
        p.y = top - p.h; p.vy = 0; p.grounded = true; p.recoilCount = 0; p.standingWindObject = i; break;
      }
    }
  }
  p.invuln = Math.max(0, p.invuln - dt); p.recoilReset = Math.max(0, p.recoilReset - dt);
  if (p.recoilReset === 0 && p.recoilCount > 0) p.recoilCount -= 1;
}
function updateEnemies(dt) {
  for (const enemy of gameState.enemies) {
    if (!enemy?.active) continue;
    if (enemy.type === "fogAnchor") {
      if (enemy.state === "staggered") {
        enemy.staggerTimer = Math.max(0, enemy.staggerTimer - dt);
        if (enemy.staggerTimer === 0) {
          enemy.state = "anchored";
          enemy.windResponseMultiplier = CONFIG.FOG_ANCHOR.NORMAL_WIND_RESPONSE;
        }
      } else if (Math.abs(gameState.player.x - enemy.x) <= CONFIG.FOG_ANCHOR.ACTIVATION_RANGE) {
        enemy.shootTimer -= dt;
        if (enemy.shootTimer <= 0) {
          const player = gameState.player;
          spawnProjectile(enemy.x + CONFIG.FOG_ANCHOR.PROJECTILE_OFFSET_X,
            enemy.y + CONFIG.FOG_ANCHOR.PROJECTILE_OFFSET_Y, player.x + player.w / 2,
            player.y + player.h / 2, false, enemy.id);
          enemy.shootTimer = CONFIG.FOG_ANCHOR.PROJECTILE_INTERVAL;
        }
      }
    }
    enemy.vy += CONFIG.ENEMY_GRAVITY * dt;
    if (gameState.input.windActive > 0) applyWind(enemy, dt);
    const maxVx = enemy.type === "fogAnchor" ? CONFIG.FOG_ANCHOR.MAX_HORIZONTAL_VELOCITY : CONFIG.ENEMY_MAX_SPEED;
    enemy.vx = clamp(enemy.vx, -maxVx, maxVx);
    if (enemy.type === "fogAnchor") {
      const drag = CONFIG.FOG_ANCHOR.DRAG * dt;
      enemy.vx = Math.abs(enemy.vx) <= drag ? 0 : enemy.vx - Math.sign(enemy.vx) * drag;
    }
    enemy.x += enemy.vx * dt; enemy.y += enemy.vy * dt;
    if (enemy.y + enemy.h >= CONFIG.GROUND_Y) { enemy.y = CONFIG.GROUND_Y - enemy.h; enemy.vy = 0; }
    if (overlaps(gameState.player, enemy)) damagePlayer(enemy.x,
      enemy.type === "fogAnchor" ? CONFIG.FOG_ANCHOR.CONTACT_DAMAGE : 1);
    if (enemy.type === "fogAnchor") {
      const fullyContained = enemy.x >= CONFIG.FOG_ANCHOR.ZONE_X &&
        enemy.x + enemy.w <= CONFIG.FOG_ANCHOR.ZONE_X + CONFIG.FOG_ANCHOR.ZONE_WIDTH &&
        enemy.y >= CONFIG.FOG_ANCHOR.ZONE_Y &&
        enemy.y + enemy.h <= CONFIG.FOG_ANCHOR.ZONE_Y + CONFIG.FOG_ANCHOR.ZONE_HEIGHT;
      if (enemy.state === "staggered" && fullyContained) neutralizeFogAnchor(enemy);
    } else enemy.active = enemy.x > CONFIG.ENEMY_MIN_X && enemy.x < CONFIG.ENEMY_MAX_X;
  }
}
function neutralizeFogAnchor(enemy) {
  enemy.active = false;
  gameState.stage.anchorNeutralized = true;
  gameState.stage.anchorFeedbackTimer = CONFIG.FOG_ANCHOR.FEEDBACK_TIME;
  for (let i = 0; i < CONFIG.FOG_ANCHOR.PARTICLE_COUNT; i += 1) {
    const angle = i / CONFIG.FOG_ANCHOR.PARTICLE_COUNT * Math.PI * 2;
    gameState.particles.push({ x: enemy.x + enemy.w / 2, y: enemy.y + enemy.h / 2,
      vx: Math.cos(angle) * CONFIG.PARTICLE_SPEED, vy: Math.sin(angle) * CONFIG.PARTICLE_SPEED,
      life: CONFIG.PARTICLE_LIFE, kind: "anchorNeutralized" });
  }
}
function spawnProjectile(x, y, targetX, targetY, bossShot, sourceEnemyId = null) {
  const dx = targetX - x, dy = targetY - y, length = Math.hypot(dx, dy) || 1;
  gameState.projectiles.push({ type: "projectile", windResponseMultiplier: CONFIG.WIND_PROJECTILE,
    x, y, r: CONFIG.PROJECTILE_R, vx: dx / length * CONFIG.PROJECTILE_SPEED,
    vy: dy / length * CONFIG.PROJECTILE_SPEED, life: CONFIG.PROJECTILE_LIFE,
    hostile: true, reflected: false, bossShot, sourceEnemyId });
}
function localCoreFog() {
  const nearby = gameState.fogCells.filter(cell => cell && Math.hypot(cell.x - CONFIG.BOSS_X, cell.y - CONFIG.BOSS_Y) < CONFIG.FOG_BOSS_RADIUS);
  return nearby.length ? nearby.reduce((sum, cell) => sum + cell.density, 0) / nearby.length : CONFIG.FOG_MIN;
}
function updateProjectiles(dt) {
  const boss = gameState.boss;
  for (const shot of gameState.projectiles) {
    if (!shot || shot.life <= 0) continue;
    if (gameState.input.windActive > 0 && applyWind(shot, dt)) { shot.reflected = true; shot.hostile = false; }
    shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
    if (shot.hostile) {
      for (const object of gameState.windObjects) {
        if (!object?.active || !circleRect(shot, { x: object.x, y: object.y, w: object.width, h: object.height })) continue;
        shot.life = 0;
        for (let i = 0; i < CONFIG.BUOY.BLOCK_PARTICLES; i += 1) {
          const angle = i / CONFIG.BUOY.BLOCK_PARTICLES * Math.PI * 2;
          gameState.particles.push({ x: shot.x, y: shot.y, vx: Math.cos(angle) * CONFIG.PARTICLE_SPEED,
            vy: Math.sin(angle) * CONFIG.PARTICLE_SPEED, life: CONFIG.PARTICLE_LIFE, kind: "buoyBlock" });
        }
        break;
      }
    }
    if (shot.life <= 0) continue;
    if (shot.hostile && circleRect(shot, gameState.player)) { damagePlayer(shot.x); shot.life = 0; }
    if (shot.life > 0 && shot.reflected && shot.sourceEnemyId) {
      const source = gameState.enemies.find(enemy => enemy?.active && enemy.type === "fogAnchor" && enemy.id === shot.sourceEnemyId);
      if (source && circleRect(shot, source)) {
        source.state = "staggered";
        source.staggerTimer = CONFIG.FOG_ANCHOR.STAGGER_DURATION;
        source.windResponseMultiplier = CONFIG.FOG_ANCHOR.STAGGERED_WIND_RESPONSE;
        source.shootTimer = CONFIG.FOG_ANCHOR.PROJECTILE_INTERVAL;
        shot.life = 0;
      }
    }
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
    // Wind primarily carries the fog cell; the smaller density loss preserves the
    // original clearing role while allowing a bank to be deliberately relocated.
    if (gameState.input.windActive > 0 && applyWind(cell, dt)) cell.density -= CONFIG.FOG_CLEAR * dt / CONFIG.WIND_DURATION;
    cell.x += cell.vx * dt; cell.y += cell.vy * dt; cell.vx *= CONFIG.FOG_DAMPING; cell.vy *= CONFIG.FOG_DAMPING;
    const suppressed = gameState.windObjects.some(object => object?.active &&
      Math.hypot(cell.x - (object.x + object.width / 2), cell.y - (object.y + object.height / 2)) <= CONFIG.BUOY.FOG_SUPPRESSION_RADIUS);
    const searchlightSource = cell.homeX >= CONFIG.SEARCHLIGHT.SOURCE_MIN_X && cell.homeX <= CONFIG.SEARCHLIGHT.SOURCE_MAX_X;
    const recovery = (searchlightSource ? CONFIG.SEARCHLIGHT.SOURCE_RECOVERY : cell.core ? CONFIG.FOG_CORE_RECOVERY : CONFIG.FOG_RECOVERY) *
      (suppressed ? CONFIG.BUOY.FOG_RECOVERY_MULTIPLIER : 1);
    const sourceDensity = searchlightSource ? Math.max(cell.baseDensity, CONFIG.SEARCHLIGHT.SOURCE_MIN_DENSITY) : cell.baseDensity;
    const target = normalized ? CONFIG.FOG_MIN : sourceDensity * (gameState.boss.anomaly / CONFIG.BOSS_ANOMALY);
    cell.density += (target - cell.density) * recovery * dt;
    cell.density = clamp(cell.density - (normalized ? CONFIG.NORMALIZE_FADE * dt : 0), CONFIG.FOG_MIN, CONFIG.FOG_MAX);
    cell.x += (cell.homeX - cell.x) * recovery * dt; cell.y += (cell.homeY - cell.y) * recovery * dt;
  }
}
function fogDensityAt(x, y) {
  let density = CONFIG.FOG_MIN;
  for (const cell of gameState.fogCells) {
    if (!cell || cell.density <= density) continue;
    const distance = Math.hypot(cell.x - x, cell.y - y);
    if (distance <= CONFIG.SEARCHLIGHT.FOG_SAMPLE_RADIUS) density = Math.max(density, cell.density);
  }
  return clamp(density, CONFIG.FOG_MIN, CONFIG.FOG_MAX);
}
function updateHazards() {
  for (const hazard of gameState.hazards) {
    if (!hazard?.active || hazard.type !== "searchlight") continue;
    const directionLength = Math.hypot(hazard.directionX, hazard.directionY) || 1;
    const dx = hazard.directionX / directionLength, dy = hazard.directionY / directionLength;
    let endpointDistance = CONFIG.SEARCHLIGHT.BEAM_RANGE;
    hazard.blockedByFog = false;
    for (let distance = CONFIG.SEARCHLIGHT.SAMPLE_STEP; distance <= endpointDistance; distance += CONFIG.SEARCHLIGHT.SAMPLE_STEP) {
      const sampleX = hazard.x + dx * distance, sampleY = hazard.y + dy * distance;
      if (sampleY >= CONFIG.GROUND_Y) { endpointDistance = distance; break; }
      if (fogDensityAt(sampleX, sampleY) >= CONFIG.SEARCHLIGHT.FOG_BLOCK_THRESHOLD) {
        endpointDistance = distance; hazard.blockedByFog = true; break;
      }
    }
    hazard.beamEndX = hazard.x + dx * endpointDistance;
    hazard.beamEndY = Math.min(CONFIG.GROUND_Y, hazard.y + dy * endpointDistance);
    const beamBounds = {
      x: Math.min(hazard.x, hazard.beamEndX) - CONFIG.SEARCHLIGHT.BEAM_WIDTH / 2,
      y: Math.min(hazard.y, hazard.beamEndY) - CONFIG.SEARCHLIGHT.BEAM_WIDTH / 2,
      w: Math.abs(hazard.beamEndX - hazard.x) + CONFIG.SEARCHLIGHT.BEAM_WIDTH,
      h: Math.abs(hazard.beamEndY - hazard.y) + CONFIG.SEARCHLIGHT.BEAM_WIDTH
    };
    if (overlaps(gameState.player, beamBounds)) damagePlayer(hazard.x, CONFIG.SEARCHLIGHT.DAMAGE, CONFIG.SEARCHLIGHT.HIT_COOLDOWN);
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
  state.stage.anchorFeedbackTimer = Math.max(0, state.stage.anchorFeedbackTimer - dt);
  if (controls.windHeld && state.input.windCooldown === 0) beginWind(controls.windDirection);
  updateWindObjects(dt); updatePlayer(dt, controls); updateEnemies(dt); updateProjectiles(dt); updateFog(dt); updateHazards(); updateBoss(dt); updateParticles(dt);
  state.enemies = state.enemies.filter(enemy => enemy?.active);
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
  renderHazards();
  const zonePulse = gameState.stage.anchorNeutralized || gameState.stage.anchorFeedbackTimer > 0;
  ctx.fillStyle = zonePulse ? "#7ce8cf55" : "#6fc6d52b";
  ctx.strokeStyle = zonePulse ? "#b7ffe9" : "#79c9d4";
  ctx.lineWidth = CONFIG.FOG_ANCHOR.ZONE_LINE_WIDTH;
  ctx.fillRect(CONFIG.FOG_ANCHOR.ZONE_X, CONFIG.FOG_ANCHOR.ZONE_Y,
    CONFIG.FOG_ANCHOR.ZONE_WIDTH, CONFIG.FOG_ANCHOR.ZONE_HEIGHT);
  ctx.strokeRect(CONFIG.FOG_ANCHOR.ZONE_X, CONFIG.FOG_ANCHOR.ZONE_Y,
    CONFIG.FOG_ANCHOR.ZONE_WIDTH, CONFIG.FOG_ANCHOR.ZONE_HEIGHT);
  ctx.fillStyle = "#d9fbff"; ctx.font = "bold 14px system-ui";
  ctx.fillText(gameState.stage.anchorNeutralized ? "CONTAINED" : "MAINTENANCE BAY",
    CONFIG.FOG_ANCHOR.ZONE_X, CONFIG.FOG_ANCHOR.ZONE_Y - CONFIG.FOG_ANCHOR.GROUND_MARK_HEIGHT);
  ctx.fillStyle = "#547987"; ctx.fillRect(CONFIG.TURRET_X - 15, CONFIG.TURRET_Y, 30, CONFIG.GROUND_Y - CONFIG.TURRET_Y);
  for (const enemy of gameState.enemies) {
    if (!enemy?.active) continue;
    if (enemy.type === "fogAnchor") renderFogAnchor(enemy);
    else drawAsset(ASSETS.light, enemy.x, enemy.y, enemy.w, enemy.h, () => { ctx.fillStyle = "#ad78bd"; ctx.beginPath(); ctx.ellipse(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.w / 2, enemy.h / 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(enemy.x + 8, enemy.y + 11, 6, 6); });
  }
  for (const object of gameState.windObjects) {
    if (!object?.active || object.type !== "observationBuoy") continue;
    const cx = object.x + object.width / 2, cy = object.y + object.height / 2;
    const suppressing = gameState.fogCells.some(cell => cell?.density > CONFIG.BUOY.SUPPRESSION_MIN_DENSITY &&
      Math.hypot(cell.x - cx, cell.y - cy) <= CONFIG.BUOY.FOG_SUPPRESSION_RADIUS);
    if (suppressing) { ctx.fillStyle = `rgba(113,235,225,${CONFIG.BUOY.INDICATOR_ALPHA})`; ctx.strokeStyle = "#8de9df"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, CONFIG.BUOY.FOG_SUPPRESSION_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    if (object.windFeedback > 0) { ctx.strokeStyle = "#b9f7ff"; ctx.lineWidth = 2; for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(object.x - CONFIG.BUOY.STREAK_LENGTH, cy + i * CONFIG.BUOY.STREAK_GAP); ctx.lineTo(object.x, cy + i * CONFIG.BUOY.STREAK_GAP); ctx.stroke(); } }
    const tilt = clamp(object.vx / CONFIG.BUOY.MAX_SPEED_X, -1, 1) * CONFIG.BUOY.TILT_MAX;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(tilt);
    drawAsset(ASSETS.buoy, -object.width / 2, -object.height / 2, object.width, object.height, () => {
      ctx.fillStyle = "#f4b34d"; ctx.beginPath(); ctx.ellipse(0, 5, object.width / 2, object.height / 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#edf8f6"; ctx.fillRect(-5, -20, 10, 22); ctx.strokeStyle = "#68d5dd"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-15, -19); ctx.lineTo(15, -19); ctx.stroke();
    }); ctx.restore();
  }
  const boss = gameState.boss;
  if (boss.active || gameState.player.x > CONFIG.BOSS_TRIGGER - CONFIG.WIDTH) drawAsset(ASSETS.boss, boss.x - boss.r, boss.y - boss.r, boss.r * 2, boss.r * 2, () => { ctx.fillStyle = localCoreFog() < CONFIG.BOSS_FOG_THRESHOLD ? "#ffd866" : "#6c748a"; ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#eafcff"; ctx.lineWidth = 5; ctx.stroke(); });
  for (const shot of gameState.projectiles) if (shot) { ctx.fillStyle = shot.reflected ? "#78f4ff" : "#ff7292"; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
  const p = gameState.player; if (p.invuln <= 0 || Math.floor(gameState.time * 12) % 2 === 0) { ctx.fillStyle = "#f5fbff"; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = "#2dcbe4"; ctx.fillRect(p.x + (p.facing > 0 ? 21 : 5), p.y + 12, 8, 8); ctx.fillStyle = "#efb94b"; ctx.fillRect(p.x + 7, p.y + 31, 20, 6); }
  for (const particle of gameState.particles) if (particle) { ctx.globalAlpha = clamp(particle.life / CONFIG.PARTICLE_LIFE, 0, 1); ctx.fillStyle = particle.kind === "buoyBlock" ? "#b9f7ff" : particle.kind === "anchorNeutralized" ? "#9affdf" : "#fff2a0"; ctx.fillRect(particle.x, particle.y, 5, 5); } ctx.globalAlpha = 1;
  if (gameState.input.windActive > 0) { const d = gameState.input.windDir, cx = p.x + p.w / 2, cy = p.y + p.h / 2; ctx.strokeStyle = "#a8f5ff"; ctx.lineWidth = 5; ctx.lineCap = "round"; for (let i = -1; i <= 1; i += 1) { ctx.beginPath(); ctx.moveTo(cx - d.y * i * 22, cy + d.x * i * 22); ctx.lineTo(cx + d.x * CONFIG.WIND_RANGE - d.y * i * 22, cy + d.y * CONFIG.WIND_RANGE + d.x * i * 22); ctx.stroke(); } }
  for (const cell of gameState.fogCells) if (cell?.density > 0) { ctx.globalAlpha = cell.density * CONFIG.FOG_ALPHA; ctx.fillStyle = "#d6e1e4"; ctx.beginPath(); ctx.arc(cell.x, cell.y, CONFIG.FOG_RADIUS, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1; ctx.restore();
}
function renderHazards() {
  for (const hazard of gameState.hazards) {
    if (!hazard?.active || hazard.type !== "searchlight") continue;
    ctx.save();
    ctx.globalAlpha = CONFIG.SEARCHLIGHT.ALPHA;
    ctx.strokeStyle = CONFIG.SEARCHLIGHT.COLOR;
    ctx.lineWidth = CONFIG.SEARCHLIGHT.BEAM_WIDTH;
    ctx.lineCap = "butt";
    ctx.shadowColor = CONFIG.SEARCHLIGHT.COLOR;
    ctx.shadowBlur = CONFIG.SEARCHLIGHT.BLOCK_GLOW_RADIUS;
    ctx.beginPath(); ctx.moveTo(hazard.x, hazard.y); ctx.lineTo(hazard.beamEndX, hazard.beamEndY); ctx.stroke();
    ctx.globalAlpha = CONFIG.SEARCHLIGHT.BLOCK_GLOW_ALPHA;
    ctx.lineWidth = CONFIG.SEARCHLIGHT.BEAM_EDGE_WIDTH;
    ctx.beginPath(); ctx.moveTo(hazard.x, hazard.y); ctx.lineTo(hazard.beamEndX, hazard.beamEndY); ctx.stroke();
    ctx.shadowBlur = 0;
    drawAsset(ASSETS.searchlight,
      hazard.x - CONFIG.SEARCHLIGHT.EMITTER_RADIUS, hazard.y - CONFIG.SEARCHLIGHT.EMITTER_RADIUS,
      CONFIG.SEARCHLIGHT.EMITTER_RADIUS * 2, CONFIG.SEARCHLIGHT.EMITTER_RADIUS * 2, () => {
        ctx.fillStyle = CONFIG.SEARCHLIGHT.COLOR; ctx.beginPath();
        ctx.arc(hazard.x, hazard.y, CONFIG.SEARCHLIGHT.EMITTER_RADIUS, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = CONFIG.PLATFORM_COLOR;
        ctx.fillRect(hazard.x - CONFIG.SEARCHLIGHT.EMITTER_RADIUS,
          hazard.y - CONFIG.SEARCHLIGHT.EMITTER_LENGTH, CONFIG.SEARCHLIGHT.EMITTER_RADIUS * 2,
          CONFIG.SEARCHLIGHT.EMITTER_LENGTH);
      });
    if (hazard.blockedByFog) {
      ctx.globalAlpha = CONFIG.SEARCHLIGHT.BLOCK_GLOW_ALPHA;
      ctx.fillStyle = CONFIG.SEARCHLIGHT.COLOR;
      ctx.beginPath(); ctx.arc(hazard.beamEndX, hazard.beamEndY,
        CONFIG.SEARCHLIGHT.BLOCK_GLOW_RADIUS, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}
function renderFogAnchor(enemy) {
  const staggered = enemy.state === "staggered";
  const vibration = staggered ? Math.sin(gameState.time * CONFIG.FOG_ANCHOR.VIBRATION_RATE) * CONFIG.FOG_ANCHOR.VIBRATION_DISTANCE : 0;
  const x = enemy.x + vibration, y = enemy.y;
  ctx.fillStyle = staggered ? "#8ef4e0" : "#182835";
  ctx.fillRect(x + (enemy.w - CONFIG.FOG_ANCHOR.GROUND_MARK_WIDTH) / 2, CONFIG.GROUND_Y - CONFIG.FOG_ANCHOR.GROUND_MARK_HEIGHT,
    CONFIG.FOG_ANCHOR.GROUND_MARK_WIDTH, CONFIG.FOG_ANCHOR.GROUND_MARK_HEIGHT);
  const asset = staggered ? ASSETS.anchorStagger : ASSETS.anchorIdle;
  drawAsset(asset, x, y, enemy.w, enemy.h, () => {
    ctx.fillStyle = staggered ? "#80ead7" : "#3b4a58";
    ctx.strokeStyle = staggered ? "#fff6ae" : "#111923";
    ctx.lineWidth = CONFIG.FOG_ANCHOR.ZONE_LINE_WIDTH;
    ctx.beginPath(); ctx.roundRect(x, y, enemy.w, enemy.h, enemy.w / CONFIG.FOG_ANCHOR.SPIKE_COUNT); ctx.fill(); ctx.stroke();
    ctx.fillStyle = staggered ? "#fff8af" : "#7c91a1";
    ctx.beginPath(); ctx.arc(x + enemy.w / 2, y + enemy.h / 2, enemy.w / CONFIG.FOG_ANCHOR.SPIKE_COUNT, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = staggered ? "#fff" : "#26333e";
    for (let i = 0; i < CONFIG.FOG_ANCHOR.SPIKE_COUNT; i += 1) {
      const sx = x + i * enemy.w / (CONFIG.FOG_ANCHOR.SPIKE_COUNT - 1);
      ctx.beginPath(); ctx.moveTo(sx, y + enemy.h); ctx.lineTo(sx, CONFIG.GROUND_Y); ctx.stroke();
    }
  });
  if (staggered) {
    ctx.strokeStyle = "#b7fff2";
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath(); ctx.moveTo(x - CONFIG.FOG_ANCHOR.STREAK_LENGTH, y + enemy.h / 2 + i * CONFIG.FOG_ANCHOR.STREAK_GAP);
      ctx.lineTo(x, y + enemy.h / 2 + i * CONFIG.FOG_ANCHOR.STREAK_GAP); ctx.stroke();
    }
  }
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
