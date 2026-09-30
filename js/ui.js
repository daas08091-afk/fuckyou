// ---- rendering & menus: overworld draw, dialogue, inventory, shop, battle screen ----
const UI = (() => {

  // ---------- tile canvas cache (a few variants per type) ----------
  const variantCount = { grassA: 3, grassB: 3, tallGrass: 2, path: 3, caveFloor: 3, flowers: 2 };
  const tileCache = {};
  function getTile(name, seedIdx = 0) {
    const key = name + "_" + seedIdx;
    if (!tileCache[key]) {
      const painter = Sprites.tiles[name];
      if (!painter) return null;
      const c = document.createElement("canvas");
      c.width = TILE; c.height = TILE;
      const rnd = mulberry32(seedIdx * 977 + 13);
      painter(c.getContext("2d"), rnd);
      tileCache[key] = c;
    }
    return tileCache[key];
  }

  // ---------- overworld ----------
  function drawMap(ctx, map, camX, camY, state) {
    const x0 = Math.floor(camX / TILE), y0 = Math.floor(camY / TILE);
    const cols = Math.ceil(640 / TILE) + 2, rows = Math.ceil(480 / TILE) + 2;
    for (let ty = y0 - 1; ty <= y0 + rows; ty++) {
      for (let tx = x0 - 1; tx <= x0 + cols; tx++) {
        const ch = (tx >= 0 && ty >= 0 && tx < map.w && ty < map.h) ? map.grid[ty][tx] : "X";
        const t = World.T[ch] || World.T["."];
        const sx = tx * TILE - camX, sy = ty * TILE - camY;
        // ground base under decorative tiles
        if (t.name === "tree" || t.name === "rock" || t.name === "sign" || t.name === "chest" || t.name === "chestOpen" || t.name === "pot") {
          ctx.drawImage(getTile(ty % 2 ? "grassB" : "grassA", (tx * 7 + ty * 13) % 3), sx, sy);
        }
        if (t.name === "door" || t.name === "bed" || t.name === "crystal" || t.name === "portal") {
          ctx.drawImage(getTile("floorWood", 0), sx, sy);
        }
        const variants = variantCount[t.name] || 1;
        const cv = getTile(t.name, (Math.abs(tx * 31 + ty * 17)) % variants);
        if (cv) ctx.drawImage(cv, sx, sy);
        else { ctx.fillStyle = "#f0f"; ctx.fillRect(sx, sy, TILE, TILE); } // debug: unknown tile
      }
    }
  }

  function drawCharacter(ctx, sheet, dir, frame, px, py, opts = {}) {
    const img = (frame > 0 ? sheet.walk[dir] : sheet.idle[dir])[frame % 4];
    const w = img.width, h = img.height;
    const dx = px - w / 2, dy = py - h + 6;
    if (!opts.noShadow) {
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.beginPath(); ctx.ellipse(px, py + 2, 11, 5, 0, 0, 7); ctx.fill();
    }
    if (opts.tint) { ctx.globalAlpha = .55; }
    ctx.drawImage(img, dx, dy);
    ctx.globalAlpha = 1;
  }

  function bubble(ctx, text, x, y) {
    ctx.font = "bold 11px 'Courier New', monospace";
    const w = ctx.measureText(text).width + 14;
    rr(ctx, x - w / 2, y - 22, w, 18, 6);
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fill();
    ctx.strokeStyle = "#333"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = "#222"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text, x, y - 12);
  }

  // ---------- panels & boxes ----------
  function panel(ctx, x, y, w, h, alpha = .92) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = `rgba(16,22,38,${alpha})`; ctx.fill();
    ctx.strokeStyle = "#e8c86a"; ctx.lineWidth = 2; ctx.stroke();
    rr(ctx, x + 3, y + 3, w - 6, h - 6, 8);
    ctx.strokeStyle = "rgba(232,200,106,.25)"; ctx.lineWidth = 1; ctx.stroke();
  }

  function bar(ctx, x, y, w, h, frac, col, label) {
    frac = clamp(frac, 0, 1);
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "#0c1120"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; ctx.stroke();
    if (frac > 0) {
      rr(ctx, x + 1, y + 1, Math.max(h - 2, (w - 2) * frac), h - 2, (h - 2) / 2);
      ctx.fillStyle = col; ctx.fill();
    }
    if (label) drawText(ctx, label, x + w / 2, y - 1, { size: 10, align: "center", color: "#dfe7f5" });
  }

  function hud(ctx, player, mapName) {
    // top-left status
    panel(ctx, 8, 8, 230, 74, .8);
    drawText(ctx, `${player.name}  Lv.${player.level}`, 20, 16, { bold: true, color: "#e8c86a", size: 14 });
    bar(ctx, 20, 40, 140, 10, player.hp / player.maxHp, "#e05252", `${player.hp}/${player.maxHp}`);
    bar(ctx, 20, 60, 140, 8, player.mp / player.maxMp, "#4a9fe8", `${player.mp}/${player.maxMp}`);
    drawText(ctx, `${player.xp}/${player.nextXp} XP`, 170, 42, { size: 10, color: "#9fb4d8" });
    drawText(ctx, `◉ ${player.gold}`, 170, 58, { size: 12, color: "#ffd94a" });
    // location tag
    const tw = ctx.measureText(mapName).width;
    ctx.font = "bold 12px 'Courier New', monospace";
    const w2 = ctx.measureText(mapName).width + 24;
    panel(ctx, 320 - w2 / 2, 8, w2, 26, .7);
    drawText(ctx, mapName, 320, 14, { size: 12, align: "center", color: "#cfe3ff", bold: true });
  }

  // ---------- dialogue box ----------
  function dialog(ctx, lines, idx, speaker, promptContinue) {
    const H = 110, Y = 480 - H - 8, X = 8, W = 640 - 16;
    panel(ctx, X, Y, W, H);
    if (speaker) {
      drawText(ctx, speaker, X + 18, Y - 14, { bold: true, color: "#ffd94a", size: 14 });
    }
    const linesTxt = wrapText(ctx, lines[idx], W - 60, "14px 'Courier New', monospace");
    linesTxt.forEach((ln, i) => drawText(ctx, ln, X + 24, Y + 24 + i * 20, { size: 14 }));
    if (promptContinue) {
      const t = Math.floor(Date.now() / 350) % 2;
      drawText(ctx, t ? "▼" : "·", X + W - 30, Y + H - 28, { color: "#e8c86a", size: 16 });
    }
  }

  // ---------- choice menu ----------
  function choices(ctx, x, y, options, cursor, title) {
    const widths = options.map(o => (o.label || o).length);
    const w = Math.max(...widths) * 9 + 60;
    const h = options.length * 26 + (title ? 30 : 16);
    panel(ctx, x, y, w, h, .95);
    let yy = y + 10;
    if (title) { drawText(ctx, title, x + 14, yy, { bold: true, color: "#e8c86a" }); yy += 24; }
    options.forEach((o, i) => {
      const label = o.label || o;
      const disabled = o.disabled;
      if (i === cursor) {
        rr(ctx, x + 8, yy - 3, w - 16, 22, 5);
        ctx.fillStyle = "rgba(232,200,106,.18)"; ctx.fill();
        drawText(ctx, "▸", x + 12, yy, { color: "#ffd94a" });
      }
      drawText(ctx, label, x + 26, yy, { color: disabled ? "#5a6b80" : (i === cursor ? "#ffffff" : "#aebadb") });
      yy += 26;
    });
    return h;
  }

  // ---------- inventory / status screen ----------
  function inventoryScreen(ctx, player, cursor, tab) {
    panel(ctx, 40, 30, 560, 420, .96);
    drawText(ctx, "— HERO —", 60, 44, { bold: true, size: 18, color: "#e8c86a" });
    const st = Data.stats(player);
    // left column: stats
    const statLines = [
      `Level ......... ${player.level}`,
      `HP ............ ${player.hp}/${player.maxHp}`,
      `MP ............ ${player.mp}/${player.maxMp}`,
      `Attack ........ ${st.atk}`,
      `Defense ....... ${st.def}`,
      `Speed ......... ${st.spd}`,
      `XP ............ ${player.xp}/${player.nextXp}`,
      `Gold .......... ${player.gold}`,
    ];
    statLines.forEach((s, i) => drawText(ctx, s, 60, 84 + i * 24, { size: 14, color: "#cfe3ff" }));
    drawText(ctx, "Skills:", 60, 300, { bold: true, color: "#c9a2ff" });
    player.skills.forEach((sk, i) => {
      const d = Data.SKILLS[sk];
      drawText(ctx, `• ${d.name} (${d.mp} MP) — ${d.desc}`, 60, 324 + i * 20, { size: 12, color: "#aebadb" });
    });

    // right column: items
    drawText(ctx, tab === "equip" ? "EQUIPMENT" : "ITEMS", 320, 84, { bold: true, color: "#e8c86a" });
    const list = player.inventory.filter(it => {
      const kind = Data.ITEMS[it.id].kind;
      return tab === "equip" ? (kind === "weapon" || kind === "armor" || kind === "acc") : !(kind === "weapon" || kind === "armor" || kind === "acc");
    });
    if (!list.length) drawText(ctx, "(empty)", 320, 116, { color: "#5a6b80" });
    list.forEach((it, i) => {
      const d = Data.ITEMS[it.id];
      const y = 112 + i * 30;
      if (i === cursor) {
        rr(ctx, 312, y - 4, 270, 26, 5);
        ctx.fillStyle = "rgba(232,200,106,.18)"; ctx.fill();
        drawText(ctx, "▸", 316, y, { color: "#ffd94a" });
      }
      drawText(ctx, `${d.name}${d.kind === "heal" || d.kind === "mp" || d.kind === "both" || d.kind === "cure" ? " x" + it.n : ""}`, 330, y, { color: i === cursor ? "#fff" : "#aebadb" });
      if (it.equipped) drawText(ctx, "[E]", 560, y, { color: "#7fd4ff", size: 12 });
    });
    if (list[cursor]) {
      const d = Data.ITEMS[list[cursor].id];
      drawText(ctx, d.desc, 60, 420, { size: 12, color: "#9fb4d8" });
      drawText(ctx, "[E] equip/use · [I]/[Esc] close", 320, 420, { size: 11, color: "#5a6b80", align: "right" });
    } else {
      drawText(ctx, "[I]/[Esc] close · [←/→] switch tab", 60, 420, { size: 11, color: "#5a6b80" });
    }
  }

  // ---------- shop ----------
  function shopScreen(ctx, player, stock, cursor, gold) {
    panel(ctx, 60, 40, 520, 400, .96);
    drawText(ctx, "PEDDLER NYX — WARES", 80, 54, { bold: true, size: 16, color: "#e8c86a" });
    drawText(ctx, `Your gold: ${gold}`, 480, 56, { color: "#ffd94a" });
    stock.forEach((id, i) => {
      const d = Data.ITEMS[id];
      const y = 96 + i * 40;
      if (i === cursor) {
        rr(ctx, 74, y - 6, 492, 34, 6);
        ctx.fillStyle = "rgba(232,200,106,.16)"; ctx.fill();
        drawText(ctx, "▸", 78, y, { color: "#ffd94a" });
      }
      const afford = gold >= d.price;
      drawText(ctx, d.name, 96, y, { color: i === cursor ? "#fff" : "#aebadb" });
      drawText(ctx, d.desc, 96, y + 16, { size: 11, color: "#7788a8" });
      drawText(ctx, `${d.price}g`, 540, y, { align: "right", color: afford ? "#ffd94a" : "#e05252" });
    });
    drawText(ctx, "[E] buy · [I]/[Esc] leave", 80, 410, { size: 11, color: "#5a6b80" });
  }

  // ---------- battle drawing ----------
  function battleBG(ctx, b, time) {
    const g = ctx.createLinearGradient(0, 0, 0, 480);
    if (b.boss) { g.addColorStop(0, "#2b0f14"); g.addColorStop(.6, "#4a1a1a"); g.addColorStop(1, "#1a0d12"); }
    else { g.addColorStop(0, "#17233d"); g.addColorStop(.55, "#27405e"); g.addColorStop(1, "#1d3122"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 480);
    // floating motes
    ctx.fillStyle = b.boss ? "rgba(255,120,80,.25)" : "rgba(180,220,255,.2)";
    for (const s of b.bgStars) {
      const y = (s.y - time * .02 * (s.r + .5)) % 480;
      ctx.beginPath(); ctx.arc(s.x, y < 0 ? y + 480 : y, s.r, 0, 7); ctx.fill();
    }
    // ground ellipse
    ctx.fillStyle = "rgba(0,0,0,.25)";
    ctx.beginPath(); ctx.ellipse(320, 330, 300, 70, 0, 0, 7); ctx.fill();
  }

  function enemyPos(b, i) {
    const n = b.enemies.length;
    const spread = n === 1 ? [0] : n === 2 ? [-90, 90] : [-140, 0, 140];
    return { x: 400 + spread[i % 3], y: 200 + (i % 2) * 40 };
  }

  function drawBattle(ctx, b, time) {
    battleBG(ctx, b, time);

    // enemies
    b.enemies.forEach((e, i) => {
      if (!e.alive) return;
      const p = enemyPos(b, i);
      const shakeX = e.shake > 0 ? (Math.random() - .5) * e.shake : 0;
      ctx.save();
      ctx.translate(p.x + shakeX, p.y + Math.sin(time / 500 + e.phase) * 3);
      const scale = e.def.boss ? 1.35 : 1;
      ctx.scale(scale, scale);
      if (e.flash > 0) ctx.globalAlpha = (Math.floor(time / 60) % 2) ? .35 : 1;
      Battle.ART[e.def.art](ctx, time + i * 300, e.def.color);
      ctx.restore();
      ctx.globalAlpha = 1;
      // hp pip bar
      const bw = 70;
      bar(ctx, p.x - bw / 2, p.y + 52, bw, 6, e.hp / e.maxHp, "#e05252");
      drawText(ctx, e.name, p.x, p.y + 62, { size: 11, align: "center", color: "#dfe7f5" });
      if (e.statuses.poison) drawText(ctx, "☠", p.x + 44, p.y + 48, { color: "#7fdc7f", size: 12 });
    });

    // hero in battle stance (back view-ish)
    const sheet = Sprites.getHeroSprites();
    const bob = Math.sin(time / 400) * 2;
    ctx.save();
    ctx.translate(150, 300 + bob);
    if (b.playerFlash > 0) ctx.globalAlpha = (Math.floor(time / 60) % 2) ? .4 : 1;
    ctx.scale(2.2, 2.2);
    ctx.drawImage(sheet.idle[3], -18, -34);
    ctx.restore();
    ctx.globalAlpha = 1;

    // player status panel
    panel(ctx, 8, 350, 250, 92, .9);
    const p = b.player, st = Data.stats(p);
    drawText(ctx, `${p.name}  Lv.${p.level}`, 20, 358, { bold: true, color: "#e8c86a" });
    bar(ctx, 20, 382, 170, 12, p.hp / p.maxHp, "#e05252", `HP ${p.hp}/${p.maxHp}`);
    bar(ctx, 20, 406, 170, 9, p.mp / p.maxMp, "#4a9fe8", `MP ${p.mp}/${p.maxMp}`);
    if (p.statuses.poison) drawText(ctx, "POISONED", 200, 402, { size: 10, color: "#7fdc7f", bold: true });

    // message / menu
    if (b.phase === "msg" || b.phase === "intro" || b.phase === "victory" || b.phase === "defeat") {
      panel(ctx, 270, 350, 362, 92, .95);
      const txt = b.phase === "victory" ? b.victoryLines[b.victoryIdx] :
                  b.phase === "defeat" ? "You collapse... darkness takes you." : b.currentMsg;
      const lines = wrapText(ctx, txt || "", 330, "14px 'Courier New', monospace");
      lines.forEach((ln, i) => drawText(ctx, ln, 288, 366 + i * 20, { size: 14 }));
      if (b.phase !== "msg" || !b.pendingStart) {
        const t = Math.floor(Date.now() / 350) % 2;
        if (t) drawText(ctx, "▼", 610, 420, { color: "#e8c86a" });
      }
    } else if (b.phase === "menu") {
      drawBattleMenu(ctx, b);
    } else if (b.phase === "target") {
      panel(ctx, 270, 350, 362, 92, .95);
      drawText(ctx, "Choose a target. [E] confirm · [Esc] back", 288, 366, { size: 13 });
      // highlight cursor enemy
      const alive = Battle.aliveEnemies(b);
      const cur = alive[b.subCursor % alive.length];
      const idx = b.enemies.indexOf(cur);
      const pos = enemyPos(b, idx);
      ctx.strokeStyle = "#ffd94a"; ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(pos.x - 45, pos.y - 55, 90, 110);
      ctx.setLineDash([]);
    }
  }

  const MAIN_OPTS = ["Fight", "Skill", "Item", "Flee"];
  function drawBattleMenu(ctx, b) {
    panel(ctx, 270, 350, 362, 92, .95);
    const p = b.player;
    if (b.menu === "main") {
      MAIN_OPTS.forEach((o, i) => {
        const col = i % 2, row = Math.floor(i / 2);
        const x = 292 + col * 160, y = 368 + row * 30;
        if (i === b.cursor) drawText(ctx, "▸", x - 14, y, { color: "#ffd94a" });
        drawText(ctx, o, x, y, { color: i === b.cursor ? "#fff" : "#aebadb", bold: i === b.cursor });
      });
    } else if (b.menu === "skill") {
      p.skills.forEach((sk, i) => {
        const d = Data.SKILLS[sk];
        const can = p.mp >= d.mp;
        const y = 364 + i * 22;
        if (i === b.cursor) drawText(ctx, "▸", 280, y, { color: "#ffd94a" });
        drawText(ctx, `${d.name} (${d.mp}MP)`, 296, y, { color: can ? (i === b.cursor ? "#fff" : "#aebadb") : "#5a6b80" });
      });
      drawText(ctx, "[Esc] back", 560, 424, { size: 11, color: "#5a6b80" });
    } else if (b.menu === "item") {
      const usable = p.inventory.filter(it => ["heal", "mp", "both", "cure"].includes(Data.ITEMS[it.id].kind));
      if (!usable.length) drawText(ctx, "(no usable items)", 296, 368, { color: "#5a6b80" });
      usable.forEach((it, i) => {
        const d = Data.ITEMS[it.id];
        const y = 364 + i * 22;
        if (i === b.cursor) drawText(ctx, "▸", 280, y, { color: "#ffd94a" });
        drawText(ctx, `${d.name} x${it.n}`, 296, y, { color: i === b.cursor ? "#fff" : "#aebadb" });
      });
      drawText(ctx, "[Esc] back", 560, 424, { size: 11, color: "#5a6b80" });
    }
  }

  // ---------- title & overlays ----------
  function titleScreen(ctx, time, hasSave) {
    const g = ctx.createLinearGradient(0, 0, 0, 480);
    g.addColorStop(0, "#0d1626"); g.addColorStop(.6, "#1c2f4a"); g.addColorStop(1, "#123524");
    ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 480);
    // moon
    ctx.fillStyle = "#f4f0da"; ctx.beginPath(); ctx.arc(520, 90, 42, 0, 7); ctx.fill();
    ctx.fillStyle = "#1c2f4a"; ctx.beginPath(); ctx.arc(536, 80, 36, 0, 7); ctx.fill();
    // hills
    ctx.fillStyle = "#0f2b1c";
    ctx.beginPath(); ctx.moveTo(0, 480); ctx.lineTo(0, 340); ctx.quadraticCurveTo(160, 280, 320, 350); ctx.quadraticCurveTo(480, 410, 640, 330); ctx.lineTo(640, 480); ctx.fill();
    // trees silhouettes
    ctx.fillStyle = "#0a1f14";
    for (let i = 0; i < 12; i++) {
      const x = 20 + i * 55, h = 30 + ((i * 37) % 25);
      ctx.beginPath(); ctx.moveTo(x, 400); ctx.lineTo(x + 12, 400 - h); ctx.lineTo(x + 24, 400); ctx.fill();
    }
    drawText(ctx, "EMBERWOOD", 320, 120, { size: 52, align: "center", bold: true, color: "#e8c86a" });
    drawText(ctx, "⚔  a tiny 2d rpg  ⚔", 320, 180, { size: 16, align: "center", color: "#9fb4d8" });
    const opts = ["New Game", ...(hasSave ? ["Continue"] : [])];
    opts.forEach((o, i) => {
      const sel = i === 0;
      drawText(ctx, (sel ? "▶ " : "   ") + o, 320, 260 + i * 34, { size: 20, align: "center", color: sel ? "#fff" : "#8fa0bf", bold: sel });
    });
    const t = Math.floor(time / 400) % 2;
    if (t) drawText(ctx, "Press ENTER / E to start", 320, 430, { size: 13, align: "center", color: "#cfe3ff" });
  }

  function fadeOverlay(ctx, alpha) {
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(0,0,0,${clamp(alpha, 0, 1)})`;
    ctx.fillRect(0, 0, 640, 480);
  }

  function toast(ctx, text, alpha) {
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.font = "bold 14px 'Courier New', monospace";
    const w = ctx.measureText(text).width + 30;
    rr(ctx, 320 - w / 2, 60, w, 30, 8);
    ctx.fillStyle = "rgba(16,22,38,.9)"; ctx.fill();
    ctx.strokeStyle = "#e8c86a"; ctx.lineWidth = 1.5; ctx.stroke();
    drawText(ctx, text, 320, 68, { align: "center", color: "#ffe9a8", bold: true });
    ctx.globalAlpha = 1;
  }

  return { drawMap, drawCharacter, bubble, panel, bar, hud, dialog, choices, inventoryScreen, shopScreen, drawBattle, titleScreen, fadeOverlay, toast, MAIN_OPTS, getTile };
})();
