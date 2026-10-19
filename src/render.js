/**
 * Gravity Wells — Procedural Canvas 2D Space Renderer
 * Renders starfields, procedural planets, rotating portals, slingshot previews, and ghost trails.
 */

import { PLAYFIELD_W, PLAYFIELD_H, PLANET_SIZES } from './constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Pre-baked starfield coordinates (3 parallax layers)
    this.stars = this.generateStars(160);

    // Planet texture offscreen cache
    this.planetTextures = {};
    this.bakePlanetTextures();
  }

  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * PLAYFIELD_W,
        y: Math.random() * PLAYFIELD_H,
        radius: 0.8 + Math.random() * 1.6,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 1.5 + Math.random() * 3.0,
        phase: Math.random() * Math.PI * 2
      });
    }
    return stars;
  }

  bakePlanetTextures() {
    for (const key in PLANET_SIZES) {
      const cfg = PLANET_SIZES[key];
      const size = cfg.radius * 2 + 16;
      const cv = document.createElement('canvas');
      cv.width = size;
      cv.height = size;
      const ctx = cv.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const r = cfg.radius;

      // Outer gravity atmospheric glow
      const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r + 7);
      glowGrad.addColorStop(0, cfg.rimColor);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
      ctx.fill();

      // Planet sphere body with 3D spherical shading
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      const bodyGrad = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.35, r * 0.1, cx, cy, r);
      bodyGrad.addColorStop(0, cfg.rimColor);
      bodyGrad.addColorStop(0.5, cfg.color);
      bodyGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bodyGrad;
      ctx.fillRect(0, 0, size, size);

      // Atmospheric surface bands
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 3;
      for (let yOff = -r + 8; yOff < r; yOff += 10) {
        ctx.beginPath();
        ctx.moveTo(cx - r, cy + yOff);
        ctx.bezierCurveTo(cx - r * 0.4, cy + yOff - 4, cx + r * 0.4, cy + yOff + 4, cx + r, cy + yOff);
        ctx.stroke();
      }

      // Terminator shadow overlay
      const shadowGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      shadowGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      shadowGrad.addColorStop(0.5, 'transparent');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
      ctx.fillStyle = shadowGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();

      // Planet outline
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      this.planetTextures[cfg.type] = cv;
    }
  }

  draw(levelManager, particleSystem, inputManager, animTime) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);

    // 1. Deep Space Nebula Background
    const bgGrad = ctx.createLinearGradient(0, 0, PLAYFIELD_W, PLAYFIELD_H);
    bgGrad.addColorStop(0, '#030712');
    bgGrad.addColorStop(0.5, '#0b0f19');
    bgGrad.addColorStop(1, '#050515');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);

    // Nebula dust cloud
    const nebulaGrad = ctx.createRadialGradient(800, 450, 80, 800, 450, 750);
    nebulaGrad.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
    nebulaGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.04)');
    nebulaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, PLAYFIELD_W, PLAYFIELD_H);

    // Starfield
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const twinkle = Math.sin(animTime * s.twinkleSpeed + s.phase) * 0.3;
      ctx.fillStyle = `rgba(248, 250, 252, ${Math.max(0.1, s.alpha + twinkle)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Allowed Placement Zones
    for (let i = 0; i < levelManager.allowedZones.length; i++) {
      const z = levelManager.allowedZones[i];
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.04)';
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeRect(z.x, z.y, z.w, z.h);

      // Label
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.font = '600 13px "Exo 2", sans-serif';
      ctx.fillText('ALLOWED PLACEMENT ZONE', z.x + 12, z.y + 22);
      ctx.restore();
    }

    // 3. Celestial Bodies (Planets & Gravity Wells)
    const bodies = levelManager.getAllBodies();
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      const tex = this.planetTextures[b.type];
      if (tex) {
        // Draw subtle gravity well ripples
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 30, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius + 65, 0, Math.PI * 2);
        ctx.stroke();

        ctx.drawImage(tex, b.x - tex.width / 2, b.y - tex.height / 2);

        // Highlight if currently dragged
        if (b.isDragging) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // 4. Target Portal
    const portal = levelManager.portal;
    ctx.save();
    ctx.translate(portal.x, portal.y);

    // Glowing core
    const pGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, portal.radius + 15);
    pGrad.addColorStop(0, '#ffffff');
    pGrad.addColorStop(0.35, '#38bdf8');
    pGrad.addColorStop(0.7, '#818cf8');
    pGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Rotating outer ring
    ctx.rotate(portal.spinAngle);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([14, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Counter-rotating inner ring
    ctx.rotate(-portal.spinAngle * 2);
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, portal.radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // 5. Ghost Trails (Last 3 Attempts)
    for (let t = 0; t < levelManager.ghostTrails.length; t++) {
      const trail = levelManager.ghostTrails[t];
      const alpha = 0.12 + (t / levelManager.ghostTrails.length) * 0.18;
      ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let p = 0; p < trail.length; p++) {
        if (p === 0) ctx.moveTo(trail[p].x, trail[p].y);
        else ctx.lineTo(trail[p].x, trail[p].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 6. Launcher & Aiming Slingshot
    const launcher = levelManager.launcher;
    ctx.save();
    // Base platform
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(launcher.x, launcher.y, launcher.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center pivot
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(launcher.x, launcher.y, 7, 0, Math.PI * 2);
    ctx.fill();

    // Directional aim barrel
    const launchAngle = launcher.angle;
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(launcher.x, launcher.y);
    ctx.lineTo(
      launcher.x + Math.cos(launchAngle) * (launcher.radius + 12),
      launcher.y + Math.sin(launchAngle) * (launcher.radius + 12)
    );
    ctx.stroke();

    // If currently dragging slingshot pull: show tension line
    if (inputManager.isDraggingSlingshot) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(launcher.x, launcher.y);
      ctx.lineTo(inputManager.dragCurrX, inputManager.dragCurrY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();

    // 7. Short Dotted Trajectory Preview (First ~0.4s only)
    if (levelManager.state === 'aiming') {
      const preview = levelManager.computeShortPreview();
      ctx.save();
      for (let i = 0; i < preview.length; i++) {
        const pt = preview[i];
        const alpha = Math.max(0.15, 1.0 - i / preview.length);
        ctx.fillStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 8. Active Comet & Flowing Tail
    const comet = levelManager.comet;
    if (comet.active && comet.trail.length > 0) {
      // Draw smooth speed-colored comet tail
      ctx.save();
      for (let i = 1; i < comet.trail.length; i++) {
        const p0 = comet.trail[i - 1];
        const p1 = comet.trail[i];
        const progress = i / comet.trail.length;
        const speed = p1.speed;

        ctx.strokeStyle = speed > 400 ? `rgba(251, 146, 60, ${progress * 0.9})` : `rgba(56, 189, 248, ${progress * 0.9})`;
        ctx.lineWidth = 2 + progress * 4;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }

      // Comet Head (Glowing white/cyan star)
      const cGrad = ctx.createRadialGradient(comet.x, comet.y, 1, comet.x, comet.y, comet.radius * 2.5);
      cGrad.addColorStop(0, '#ffffff');
      cGrad.addColorStop(0.4, '#38bdf8');
      cGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = cGrad;
      ctx.beginPath();
      ctx.arc(comet.x, comet.y, comet.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(comet.x, comet.y, comet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. Particle Effects
    particleSystem.draw(ctx);
  }
}
