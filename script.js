const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game Variables
let slicedCount = 0;
let computeValue = 0;
let lives = 3;
let gameOver = false;
let spawnTimer = 0;

// Danger Boundary Line Position (Near bottom of screen)
const DANGER_LINE_Y = 440;

// Laser Trail
let bladePath = []; // {x, y, time}

// Canvas Entities
let flyingItems = [];
let slicedHalves = [];
let particles = [];
let gridSplashes = [];

// AI Generative Node Database
const AI_NODES = [
  { id: 'neural_melon', name: 'Neural Matrix Core', compute: 12.5, isBomb: false, color: '#FCA311', coreColor: '#FFFFFF', radius: 24, tip: '⚡ Neural Matrix Cores process 10,000 synthetic parameters per millisecond.' },
  { id: 'cyber_banana', name: 'Quantum Data Strand', compute: 4.8, isBomb: false, color: '#E5E5E5', coreColor: '#FCA311', radius: 18, tip: '⚡ Quantum Strands accelerate matrix multiplication with zero thermal noise.' },
  { id: 'quantum_apple', name: 'Synthetix Node', compute: 8.5, isBomb: false, color: '#FCA311', coreColor: '#E5E5E5', radius: 20, tip: '⚡ Synthetix Nodes stream real-time generative visual vectors.' },
  { id: 'nano_carrot', name: 'Bio-Vector Core', compute: 6.2, isBomb: false, color: '#E5E5E5', coreColor: '#FFFFFF', radius: 18, tip: '⚡ Bio-Vectors optimize neural network gradient convergence rates.' },
  { id: 'bio_broccoli', name: 'Generative Cluster', compute: 15.0, isBomb: false, color: '#FCA311', coreColor: '#FFFFFF', radius: 22, tip: '⚡ Generative Clusters produce ultra-high resolution latent space renders.' },
  { id: 'malware_trap', name: 'Corrupted Malware Bomb', compute: -25.0, isBomb: true, color: '#FF2A2A', coreColor: '#000000', radius: 22, tip: '💥 BREACH DETECTED! Malware injection drained compute capacity & damaged system integrity!' }
];

// Trigger Screen Flash on Bomb Explosion
function triggerWhiteFlash() {
  const flash = document.getElementById("flashOverlay");
  if (!flash) return;
  flash.classList.add("active");
  setTimeout(() => {
    flash.classList.remove("active");
  }, 250);
}

// Sound Synthesizer
function playLaserSound(type) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const actx = new AudioCtx();
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

// Node Drawing Routines
function drawAINodeShape(ctx, node) {
  const radius = node.radius;

  ctx.save();
  ctx.shadowColor = node.color;
  ctx.shadowBlur = 14;

  if (node.isBomb) {
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#FF2A2A';
    ctx.lineWidth = 3;

    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const r = (i % 2 === 0) ? radius + 6 : radius - 4;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = '#FF2A2A';
    ctx.font = '900 15px monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⚠', 0, 0);
  } else {
    ctx.fillStyle = '#14213D';
    ctx.strokeStyle = node.color;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.fillStyle = node.coreColor;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 0.8, radius * 0.25, Math.PI / 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHalvedAINode(ctx, node, side) {
  ctx.save();
  ctx.clip(new Path2D(side === 1 ? 'M -60 -60 L 0 -60 L 0 60 L -60 60 Z' : 'M 0 -60 L 60 -60 L 60 60 L 0 60 Z'));
  drawAINodeShape(ctx, node);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = node.isBomb ? '#FF2A2A' : '#FCA311';
  ctx.shadowBlur = 10;
  ctx.fillRect(-2, -node.radius - 8, 4, (node.radius + 8) * 2);
  ctx.restore();
}

// Spawning Engine (Spawns above the line and controlled power)
function spawnCluster() {
  if (gameOver) return;

  const count = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < count; i++) {
    const nodeDef = AI_NODES[Math.floor(Math.random() * AI_NODES.length)];

    flyingItems.push({
      ...nodeDef,
      x: 50 + Math.random() * (canvas.width - 100),
      y: DANGER_LINE_Y - 15,
      vx: (Math.random() - 0.5) * 3.5,
      vy: -(9.5 + Math.random() * 2.5), // Velocity calculated to keep items within top boundary
      gravity: 0.25,
      rotation: Math.random() * Math.PI,
      vRot: (Math.random() - 0.5) * 0.12,
      sliced: false
    });
  }
}

// Distance Detector for Slicing
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
  document.getElementById
