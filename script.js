const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let slicedCount = 0;
let computeValue = 0;
let lives = 3;
let gameOver = false;
let spawnTimer = 0;

const DANGER_LINE_Y = 440;

let bladePath = [];
let flyingItems = [];
let slicedHalves = [];
let particles = [];
let gridSplashes = [];

// Food items inspired by high-contrast pattern, preserving red malware bomb
const FOOD_ITEMS = [
  { id: 'apple', name: 'Golden Apple', compute: 10.0, isBomb: false, color: '#FCA311', radius: 22, tip: '🍎 Golden Apples boost nutrient processing & matrix compute density!' },
  { id: 'banana', name: 'Quantum Banana', compute: 6.5, isBomb: false, color: '#FCA311', radius: 20, tip: '🍌 Quantum Bananas provide high-potassium kinetic momentum.' },
  { id: 'strawberry', name: 'Vector Strawberry', compute: 8.0, isBomb: false, color: '#FCA311', radius: 18, tip: '🍓 Vector Strawberries optimize micro-gradient convergence rates.' },
  { id: 'broccoli', name: 'Cluster Broccoli', compute: 14.0, isBomb: false, color: '#14213D', radius: 24, tip: '🥦 Cluster Broccoli expands latent space visual neural trees.' },
  { id: 'avocado', name: 'Bio Avocado', compute: 12.0, isBomb: false, color: '#14213D', radius: 22, tip: '🥑 Bio Avocados deliver essential healthy lipid compute units.' },
  { id: 'salmon', name: 'Omega Salmon', compute: 15.0, isBomb: false, color: '#FCA311', radius: 22, tip: '🍣 Omega Salmon Fillets supercharge real-time matrix multiplication.' },
  { id: 'rice_bowl', name: 'Data Rice Bowl', compute: 9.0, isBomb: false, color: '#FFFFFF', radius: 20, tip: '🍚 Data Rice Bowls maintain continuous baseline system energy.' },
  { id: 'mushroom', name: 'Spore Mushroom', compute: 7.5, isBomb: false, color: '#E5E5E5', radius: 18, tip: '🍄 Spore Mushrooms accelerate neural interconnect response time.' },
  { id: 'malware_trap', name: 'Corrupted Malware Bomb', compute: -25.0, isBomb: true, color: '#FF2A2A', radius: 22, tip: '💥 BREACH DETECTED! Malware injection damaged food matrix integrity!' }
];

let globalAudioCtx = null;
function getAudioContext() {
  if (!globalAudioCtx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

function playLaserSound(type) {
  try {
    const actx = getAudioContext();
    if (!actx) return;
    const osc = actx.createOscillator();
    const gain = actx.createGain();
    osc.connect(gain);
    gain.connect(actx.destination);

    if (type === 'slash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, actx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.25, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.08);
      osc.start(); osc.stop(actx.currentTime + 0.08);
    } else if (type === 'explode') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, actx.currentTime);
      osc.frequency.linearRampToValueAtTime(30, actx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.5, actx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, actx.currentTime + 0.35);
      osc.start(); osc.stop(actx.currentTime + 0.35);
    }
  } catch(e) {}
}

function triggerWhiteFlash() {
  const flash = document.getElementById("flashOverlay");
  if (!flash) return;
  flash.classList.add("active");
  setTimeout(() => { flash.classList.remove("active"); }, 250);
}

// Canvas rendering routine for high-contrast food items
function drawFoodShape(ctx, item) {
  const r = item.radius;
  ctx.save();
  ctx.shadowColor = item.color;
  ctx.shadowBlur = 12;

  switch(item.id) {
    case 'apple':
      ctx.fillStyle = '#FCA311';
      ctx.beginPath();
      ctx.arc(-r * 0.35, 0, r * 0.65, 0, Math.PI * 2);
      ctx.arc(r * 0.35, 0, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.quadraticCurveTo(3, -r * 1.0, 7, -r * 1.1);
      ctx.stroke();

      ctx.fillStyle = '#14213D';
      ctx.beginPath();
      ctx.ellipse(-5, -r * 0.7, 6, 3, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'banana':
      ctx.fillStyle = '#FCA311';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0.25 * Math.PI, 0.95 * Math.PI);
      ctx.arc(-r * 0.25, -r * 0.25, r * 0.85, 0.95 * Math.PI, 0.25 * Math.PI, true);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;

    case 'strawberry':
      ctx.fillStyle = '#FCA311';
      ctx.beginPath();
      ctx.moveTo(0, r * 0.9);
      ctx.quadraticCurveTo(-r * 1.1, 0, -r * 0.6, -r * 0.5);
      ctx.quadraticCurveTo(0, -r * 0.8, 0, -r * 0.4);
      ctx.quadraticCurveTo(0, -r * 0.8, r * 0.6, -r * 0.5);
      ctx.quadraticCurveTo(r * 1.1, 0, 0, r * 0.9);
      ctx.fill();

      ctx.fillStyle = '#14213D';
      [-5, 0, 5].forEach(x => {
        [-2, 4].forEach(y => {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(0, -r * 0.9);
      ctx.lineTo(r * 0.5, -r * 0.5);
      ctx.fill();
      break;

    case 'broccoli':
      ctx.fillStyle = '#E5E5E5';
      ctx.fillRect(-r * 0.25, 0, r * 0.5, r * 0.8);

      ctx.fillStyle = '#14213D';
      ctx.strokeStyle = '#FCA311';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.4, r * 0.55, 0, Math.PI * 2);
      ctx.arc(-r * 0.45, -r * 0.1, r * 0.45, 0, Math.PI * 2);
      ctx.arc(r * 0.45, -r * 0.1, r * 0.45, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      break;

    case 'avocado':
      ctx.fillStyle = '#14213D';
      ctx.strokeStyle = '#FCA311';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.75, r, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#E5E5E5';
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.55, r * 0.75, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FCA311';
      ctx.beginPath();
      ctx.arc(0, r * 0.2, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'salmon':
      ctx.fillStyle = '#FCA311';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.6, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      [-r * 0.4, 0, r * 0.4].forEach(offset => {
        ctx.beginPath();
        ctx.moveTo(offset - 4, -r * 0.3);
        ctx.lineTo(offset + 4, r * 0.3);
        ctx.stroke();
      });
      break;

    case 'rice_bowl':
      ctx.fillStyle = '#14213D';
      ctx.strokeStyle = '#FCA311';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, 0, Math.PI);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.85, Math.PI, 0);
      ctx.fill();

      ctx.fillStyle = '#14213D';
      [-8, -2, 4, 8].forEach(x => {
        ctx.beginPath();
        ctx.arc(x, -r * 0.3, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
      break;

    case 'mushroom':
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-r * 0.25, -r * 0.1, r * 0.5, r * 0.75);

      ctx.fillStyle = '#E5E5E5';
      ctx.strokeStyle = '#FCA311';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * 0.75, Math.PI, 0);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      break;

    case 'malware_trap':
    default:
      // Red malware bomb preserved as red spiky core with warning icon
      ctx.fillStyle = '#000000';
      ctx.strokeStyle = '#FF2A2A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const dist = (i % 2 === 0) ? r + 6 : r - 4;
        const x = Math.cos(angle) * dist;
        const y = Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#FF2A2A';
      ctx.font = '900 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚠', 0, 0);
      break;
  }

  ctx.restore();
}

function drawHalvedFoodNode(ctx, node, side) {
  ctx.save();
  ctx.clip(new Path2D(side === 1 ? 'M -60 -60 L 0 -60 L 0 60 L -60 60 Z' : 'M 0 -60 L 60 -60 L 60 60 L 0 60 Z'));
  drawFoodShape(ctx, node);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = node.isBomb ? '#FF2A2A' : '#FCA311';
  ctx.shadowBlur = 10;
  ctx.fillRect(-2, -node.radius - 8, 4, (node.radius + 8) * 2);
  ctx.restore();
}

function spawnCluster() {
  if (gameOver) return;

  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    const nodeDef = FOOD_ITEMS[Math.floor(Math.random() * FOOD_ITEMS.length)];

    flyingItems.push({
      ...nodeDef,
      x: 50 + Math.random() * (canvas.width - 100),
      y: DANGER_LINE_Y - 15,
      vx: (Math.random() - 0.5) * 3.5,
      vy: -(9.5 + Math.random() * 2.5),
      gravity: 0.25,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.12,
      sliced: false
    });
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function checkSlices() {
  if (bladePath.length < 2) return;

  const p1 = bladePath[bladePath.length - 2];
  const p2 = bladePath[bladePath.length - 1];

  for (let i = flyingItems.length - 1; i >= 0; i--) {
    const item = flyingItems[i];
    if (item.sliced) continue;

    const dist = distToSegment(item.x, item.y, p1.x, p1.y, p2.x, p2.y);

    if (dist < item.radius + 8) {
      item.sliced = true;

      if (item.isBomb) {
        triggerWhiteFlash();
        playLaserSound('explode');
        createCyberExplosion(item.x, item.y);
        triggerGameOver("💥 MALWARE BREACH! Sliced a Corrupted Virus Bomb!");
        return;
      }

      playLaserSound('slash');
      slicedCount++;
      computeValue += item.compute;

      document.getElementById('sliced-count').innerText = slicedCount;
      document.getElementById('budget-display').innerText = `${computeValue.toFixed(1)} FLOPS`;
      document.getElementById('tip-display').innerHTML = item.tip;

      gridSplashes.push({
        x: item.x, y: item.y,
        color: item.color,
        radius: 10, alpha: 0.9
      });

      for (let p = 0; p < 16; p++) {
        particles.push({
          x: item.x, y: item.y,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10,
          color: Math.random() > 0.5 ? item.color : '#FFFFFF',
          size: 2 + Math.random() * 4,
          alpha: 1.0
        });
      }

      slicedHalves.push({
        node: item, side: 1,
        x: item.x - 6, y: item.y, vx: item.vx - 3, vy: item.vy - 1, gravity: 0.3,
        rotation: item.rotation, vRot: -0.1
      });
      slicedHalves.push({
        node: item, side: 2,
        x: item.x + 6, y: item.y, vx: item.vx + 3, vy: item.vy - 1, gravity: 0.3,
        rotation: item.rotation, vRot: 0.1
      });

      flyingItems.splice(i, 1);
    }
  }
}

function createCyberExplosion(x, y) {
  for (let i = 0; i < 45; i++) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 18,
      color: Math.random() > 0.4 ? '#FF2A2A' : '#FCA311',
      size: 4 + Math.random() * 6,
      alpha: 1.0
    });
  }
}

function updateLivesUI() {
  let shields = "";
  for (let i = 0; i < 3; i++) {
    shields += (i < lives) ? "🛡️ " : "❌ ";
  }
  document.getElementById("lives-display").innerText = shields.trim();
}

function triggerGameOver(reason) {
  gameOver = true;
  document.getElementById("death-reason").innerText = reason;
  document.getElementById("final-sliced").innerText = slicedCount;
  document.getElementById("final-budget").innerText = `${computeValue.toFixed(1)} FLOPS`;
  document.getElementById("gameOverScreen").style.display = "flex";
}

function resetGame() {
  slicedCount = 0;
  computeValue = 0;
  lives = 3;
  gameOver = false;
  flyingItems = [];
  slicedHalves = [];
  particles = [];
  gridSplashes = [];
  bladePath = [];

  document.getElementById("sliced-count").innerText = "0";
  document.getElementById("budget-display").innerText = "0.0 FLOPS";
  document.getElementById("tip-display").innerHTML = "⚡ <strong>NEURAL PROTOCOL:</strong> Slash airborne AI Data Foods! Avoid slicing Red Malware Bombs!";
  document.getElementById("gameOverScreen").style.display = "none";

  updateLivesUI();
}

function update() {
  if (gameOver) return;

  spawnTimer++;
  if (spawnTimer > 70) {
    spawnCluster();
    spawnTimer = 0;
  }

  for (let i = flyingItems.length - 1; i >= 0; i--) {
    const item = flyingItems[i];
    item.x += item.vx;
    item.y += item.vy;
    item.vy += item.gravity;
    item.rotation += item.vRot;

    if (item.x - item.radius < 10) {
      item.x = 10 + item.radius;
      item.vx = Math.abs(item.vx) * 0.8;
    } else if (item.x + item.radius > canvas.width - 10) {
      item.x = canvas.width - 10 - item.radius;
      item.vx = -Math.abs(item.vx) * 0.8;
    }

    if (item.y - item.radius < 20) {
      item.y = 20 + item.radius;
      item.vy = Math.abs(item.vy) * 0.5;
    }

    if (item.y > DANGER_LINE_Y && item.vy > 0) {
      if (!item.isBomb && !item.sliced) {
        lives--;
        updateLivesUI();
        
        gridSplashes.push({
          x: item.x, y: DANGER_LINE_Y,
          color: '#FF2A2A',
          radius: 12, alpha: 1.0
        });

        if (lives <= 0) {
          triggerGameOver("System Integrity Depleted! Food items crossed Danger Line!");
        }
      }
      flyingItems.splice(i, 1);
    }
  }

  for (let i = slicedHalves.length - 1; i >= 0; i--) {
    const half = slicedHalves[i];
    half.x += half.vx;
    half.y += half.vy;
    half.vy += half.gravity;
    half.rotation += half.vRot;

    if (half.y > canvas.height + 40) {
      slicedHalves.splice(i, 1);
    }
  }

  for (let i = gridSplashes.length - 1; i >= 0; i--) {
    const s = gridSplashes[i];
    s.radius += 2.5;
    s.alpha -= 0.04;
    if (s.alpha <= 0) gridSplashes.splice(i, 1);
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.03;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  const now = Date.now();
  bladePath = bladePath.filter(p => now - p.time < 160);

  checkSlices();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = "rgba(252, 163, 17, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 25) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 25) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = '#FF2A2A';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#FF2A2A';
  ctx.shadowBlur = 10;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, DANGER_LINE_Y);
  ctx.lineTo(canvas.width, DANGER_LINE_Y);
  ctx.stroke();

  ctx.fillStyle = '#FF2A2A';
  ctx.font = '900 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⚡ DANGER LINE ⚡', canvas.width / 2, DANGER_LINE_Y + 14);
  ctx.restore();

  gridSplashes.forEach(s => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, s.alpha);
    ctx.strokeStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  flyingItems.forEach(item => {
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.rotation);
    drawFoodShape(ctx, item);
    ctx.restore();
  });

  slicedHalves.forEach(half => {
    ctx.save();
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);
    drawHalvedFoodNode(ctx, half.node, half.side);
    ctx.restore();
  });

  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  if (bladePath.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i < bladePath.length; i++) {
      const p1 = bladePath[i - 1];
      const p2 = bladePath[i];
      const alpha = i / bladePath.length;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = alpha * 8;
      ctx.strokeStyle = '#FFFFFF';
      ctx.shadowColor = '#FCA311';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = alpha;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function addBladePoint(e) {
  const rect = canvas.getBoundingClientRect();
  let clientX, clientY;

  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }

  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);

  bladePath.push({ x, y, time: Date.now() });
}

let isSwiping = false;

canvas.addEventListener('mousedown', e => { isSwiping = true; getAudioContext(); addBladePoint(e); });
canvas.addEventListener('mousemove', e => { if (isSwiping) addBladePoint(e); });
window.addEventListener('mouseup', () => isSwiping = false);

canvas.addEventListener('touchstart', e => { isSwiping = true; getAudioContext(); addBladePoint(e); }, { passive: true });
canvas.addEventListener('touchmove', e => { if (isSwiping) addBladePoint(e); }, { passive: true });
window.addEventListener('touchend', () => isSwiping = false);

gameLoop();
