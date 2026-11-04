'use client';
import { useEffect, useRef } from 'react';
export interface CanvasModel { progress: number; flying: boolean; zone: number; inZone: boolean; pitching: boolean; gauge: number; }
export default function GameCanvas({ model }: { model: CanvasModel }) {
  const host = useRef<HTMLDivElement>(null); const current = useRef(model);
  current.current = model;
  useEffect(() => {
    let disposed = false; let game: import('phaser').Game | undefined;
    import('phaser').then(({ default: Phaser }) => {
      if (disposed || !host.current) return;
      class DiamondScene extends Phaser.Scene {
        graphics!: import('phaser').GameObjects.Graphics;
        create() { this.graphics = this.add.graphics(); }
        update() {
          const g = this.graphics; const m = current.current; if (!g) return;
          g.clear(); g.fillStyle(0x133d30); g.fillRect(0, 0, 640, 360);
          g.fillStyle(0x24563c); g.fillTriangle(320, 330, 40, 80, 600, 80);
          g.fillStyle(0x96734a); g.fillTriangle(320, 330, 180, 160, 460, 160);
          g.lineStyle(2, 0xc9d5af, .7); g.lineBetween(320, 330, 40, 80); g.lineBetween(320, 330, 600, 80);
          g.fillStyle(0xcba577); g.fillEllipse(320, 126, 60, 24);
          g.fillStyle(0xd4f17b); g.fillCircle(320, 99, 8); g.fillRect(313, 108, 14, 23);
          g.lineStyle(2, 0xd4f17b, .7); g.strokeRect(248, 190, 144, 126);
          for (let i = 1; i < 3; i++) { g.lineBetween(248 + i * 48, 190, 248 + i * 48, 316); g.lineBetween(248, 190 + i * 42, 392, 190 + i * 42); }
          const x = 272 + m.zone % 3 * 48 + (m.inZone ? 0 : 106); const y = 211 + Math.floor(m.zone / 3) * 42;
          if (m.flying) { const t = Math.max(0, Math.min(1.1, m.progress)); g.fillStyle(0xffffff); g.fillCircle(320 + (x - 320) * t, 128 + (y - 128) * t, 3 + t * 8); }
          g.fillStyle(0xf4eee0); g.fillTriangle(310, 332, 330, 332, 320, 342);
          if (m.pitching) { g.fillStyle(0x101c19); g.fillRect(90, 20, 460, 18); g.fillStyle(0xd4f17b); g.fillRect(300, 20, 40, 18); g.fillStyle(0xffffff); g.fillRect(90 + m.gauge * 456, 17, 4, 24); }
        }
      }
      game = new Phaser.Game({ type: Phaser.CANVAS, parent: host.current, width: 640, height: 360, backgroundColor: '#133d30', scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: DiamondScene, audio: { noAudio: true }, banner: false });
    });
    return () => { disposed = true; game?.destroy(true); };
  }, []);
  return <div className="gameCanvas" ref={host} role="img" aria-label="야구장, 투수와 9분할 스트라이크 존. 공이 홈플레이트에 도착할 때 스윙하세요." />;
}
