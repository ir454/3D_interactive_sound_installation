// === CONFIG ===
const WORLD_WIDTH = 100;
const WORLD_DEPTH = 100;
const BLOCK_SIZE = 1;
const HEIGHT_SCALE = 10;
const NOISE_SCALE = 0.08;
const SOUND_SPACING = 7;
const SOUND_RADIUS = 10;

// === SCENE ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(WORLD_WIDTH / 2, 20, WORLD_DEPTH * 1.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// === LIGHTING ===
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(100, 200, 100);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// === MATERIALS ===
const materials = {
  grass: new THREE.MeshStandardMaterial({ color: 0x228b22 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x8b4513 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x808080 }),
};

// === TERRAIN GENERATION ===
noise.seed(Math.random());
const geometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

console.log("Generating terrain...");
let soundPoints = [];

for (let x = 0; x < WORLD_WIDTH; x++) {
  for (let z = 0; z < WORLD_DEPTH; z++) {
    const heightValue = Math.floor(
      (noise.perlin2(x * NOISE_SCALE, z * NOISE_SCALE) + 1) / 2 * HEIGHT_SCALE
    );

    for (let y = 0; y <= heightValue; y++) {
      let mat = materials.dirt;
      if (y === heightValue) mat = materials.grass;
      else if (y < heightValue - 2) mat = materials.stone;

      const block = new THREE.Mesh(geometry, mat);
      block.position.set(x * BLOCK_SIZE, y * BLOCK_SIZE, z * BLOCK_SIZE);
      scene.add(block);
    }

    // Sound circle every ~7 blocks
    if (x % SOUND_SPACING === 0 && z % SOUND_SPACING === 0) {
      const circleGeo = new THREE.CircleGeometry(0.5, 16);
      const circleMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, side: THREE.DoubleSide });
      const circle = new THREE.Mesh(circleGeo, circleMat);
      circle.position.set(x, heightValue + 1.1, z);
      circle.rotation.x = -Math.PI / 2;
      scene.add(circle);

      soundPoints.push({
        mesh: circle,
        position: new THREE.Vector3(x, heightValue + 1.1, z),
        nextPlay: 0
      });
    }
  }
}
console.log("Terrain generated with", soundPoints.length, "sound circles.");

// === AUDIO SETUP ===
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const listener = audioCtx.listener;
listener.positionX.value = camera.position.x;
listener.positionY.value = camera.position.y;
listener.positionZ.value = camera.position.z;

// Frequencies for random melodies (C major)
const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 493.88, 523.25];

function playSpatialMelody(point, cameraPos) {
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const now = audioCtx.currentTime;

  // Create 3D panner for spatial sound
  const panner = audioCtx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'linear';
  panner.refDistance = 1;
  panner.maxDistance = SOUND_RADIUS;
  panner.rolloffFactor = 1.0;
  panner.setPosition(point.position.x, point.position.y, point.position.z);

  for (let i = 0; i < 5; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const note = scale[Math.floor(Math.random() * scale.length)];

    osc.type = 'sine';
    osc.frequency.value = note;

    gain.gain.setValueAtTime(0.2, now + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.25);

    osc.connect(gain).connect(panner).connect(audioCtx.destination);
    osc.start(now + i * 0.3);
    osc.stop(now + i * 0.3 + 0.25);
  }

  // Visual feedback
  point.mesh.material.color.set(0xffff00);
  setTimeout(() => point.mesh.material.color.set(0xff00ff), 800);
}

// === MOVEMENT CONTROLS ===
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

let yaw = 0, pitch = 0;
const speed = 0.3;
const lookSpeed = 0.002;

document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
document.addEventListener("click", () => document.body.requestPointerLock());
document.addEventListener("mousemove", (e) => {
  if (document.pointerLockElement === document.body) {
    yaw -= e.movementX * lookSpeed;
    pitch -= e.movementY * lookSpeed;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  }
});

// === MAIN LOOP ===
function animate() {
  requestAnimationFrame(animate);

  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  if (keys["w"]) camera.position.addScaledVector(forward, -speed);
  if (keys["s"]) camera.position.addScaledVector(forward, speed);
  if (keys["a"]) camera.position.addScaledVector(right, -speed);
  if (keys["d"]) camera.position.addScaledVector(right, speed);

  // Keep player inside world bounds
  camera.position.x = Math.max(0, Math.min(WORLD_WIDTH, camera.position.x));
  camera.position.z = Math.max(0, Math.min(WORLD_DEPTH, camera.position.z));

  camera.lookAt(
    camera.position.x + Math.sin(yaw),
    camera.position.y + Math.tan(pitch),
    camera.position.z + Math.cos(yaw)
  );

  // Update listener position
  listener.positionX.value = camera.position.x;
  listener.positionY.value = camera.position.y;
  listener.positionZ.value = camera.position.z;

  // Trigger sound when nearby
  const now = performance.now();
  for (const p of soundPoints) {
    const dist = camera.position.distanceTo(p.position);
    if (dist < SOUND_RADIUS && now > p.nextPlay) {
      playSpatialMelody(p, camera.position);
      p.nextPlay = now + 4000 + Math.random() * 3000;
    }
  }

  renderer.render(scene, camera);
}
animate();

// === RESIZE ===
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
