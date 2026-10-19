/**
 * Gravity Wells — Space Particle Effects
 * Handles comet tail sparkles, crash explosions, and portal win swirls.
 */

export class ParticleSystem {
  constructor(maxParticles = 300) {
    this.maxParticles = maxParticles;
    this.particles = [];
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 3,
        color: '#fff'
      });
    }
  }

  reset() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].active = false;
    }
  }

  spawnTailSpark(x, y, speed) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 4;
        p.y = y + (Math.random() - 0.5) * 4;
        p.vx = (Math.random() - 0.5) * 15;
        p.vy = (Math.random() - 0.5) * 15;
        p.maxLife = 0.25 + Math.random() * 0.15;
        p.life = p.maxLife;
        p.size = 2.5 + Math.min(speed / 160, 3.5);
        p.color = speed > 400 ? '#f59e0b' : '#38bdf8';
        break;
      }
    }
  }

  spawnExplosion(x, y, count = 28) {
    let spawned = 0;
    const colors = ['#f87171', '#fb923c', '#facc15', '#ffffff'];

    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 220;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.maxLife = 0.5 + Math.random() * 0.4;
        p.life = p.maxLife;
        p.size = 3 + Math.random() * 4;
        p.color = colors[Math.floor(Math.random() * colors.length)];
        spawned++;
      }
    }
  }

  spawnWinBurst(x, y, count = 35) {
    let spawned = 0;
    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#fef08a'];

    for (let i = 0; i < this.maxParticles && spawned < count; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = 60 + Math.random() * 180;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.maxLife = 0.8 + Math.random() * 0.5;
        p.life = p.maxLife;
        p.size = 3.5 + Math.random() * 4;
        p.color = colors[Math.floor(Math.random() * colors.length)];
        spawned++;
      }
    }
  }

  update(dt) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        }
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.active) {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}
