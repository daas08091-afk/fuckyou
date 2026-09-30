// ---- turn-based battle system (state machine driven from game.js) ----
const Battle = (() => {

  // monster portrait painters — procedural pixel-ish art at scale s
  const ART = {
    slime(g, t, col) {
      const bob = Math.sin(t / 300) * 4;
      g.fillStyle = "rgba(0,0,0,.25)"; ellipse(g, 0, 34, 34, 8);
      const grd = g.createRadialGradient(-8, -14 + bob, 4, 0, bob, 36);
      grd.addColorStop(0, "#a7f3b0"); grd.addColorStop(1, col);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(-30, 30);
      g.bezierCurveTo(-36, -10 + bob, -18, -30 + bob, 0, -30 + bob);
      g.bezierCurveTo(18, -30 + bob, 36, -10 + bob, 30, 30);
      g.quadraticCurveTo(0, 38, -30, 30);
      g.fill();
      g.fillStyle = "#1c1c28"; circle(g, -10, -4 + bob, 4); circle(g, 10, -4 + bob, 4);
      g.strokeStyle = "#1c1c28"; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, 4 + bob, 8, .2, Math.PI - .2); g.stroke();
      g.fillStyle = "rgba(255,255,255,.5)"; ellipse(g, -12, -18 + bob, 7, 4);
    },
    bat(g, t, col) {
      const flap = Math.sin(t / 120) * 10;
      g.fillStyle = col;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(0, -4);
        g.quadraticCurveTo(s * 26, -22 - flap, s * 44, -6 - flap);
        g.quadraticCurveTo(s * 30, 2, s * 34, 14 - flap / 2);
        g.quadraticCurveTo(s * 18, 4, 0, 10);
        g.fill();
      }
      g.fillStyle = "#241d33";
      circle(g, 0, 0, 13);
      g.fillStyle = col; triangle(g, -8, -12, -12, -24, -2, -14); triangle(g, 8, -12, 12, -24, 2, -14);
      g.fillStyle = "#ffdf6d"; circle(g, -5, -2, 2.6); circle(g, 5, -2, 2.6);
      g.fillStyle = "#fff"; triangle(g, -3, 5, 3, 5, 0, 10);
    },
    spider(g, t, col) {
      const wig = Math.sin(t / 200) * 2;
      g.strokeStyle = "#3d2417"; g.lineWidth = 4; g.lineCap = "round";
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const a = (-.9 + i * .42) * s;
        g.beginPath();
        g.moveTo(s * 10, -2 + i * 3);
        g.quadraticCurveTo(s * (26 + i * 2), -18 + i * 8 + wig, s * (34 + i * 3), 8 + i * 5);
        g.stroke();
      }
      g.fillStyle = col; ellipse(g, 6, 8, 18, 15);
      g.fillStyle = "#5e3420"; ellipse(g, -10, -4, 12, 10);
      g.fillStyle = "#241017"; circle(g, -14, -7, 2.5); circle(g, -8, -7, 2.5);
      g.fillStyle = "#ff5b5b";
      circle(g, -13, -2, 1.6); circle(g, -10, -2, 1.6); circle(g, -7, -2, 1.6);
    },
    goblin(g, t, col) {
      const hop = Math.abs(Math.sin(t / 350)) * 3;
      g.fillStyle = "rgba(0,0,0,.25)"; ellipse(g, 0, 36, 22, 6);
      g.save(); g.translate(0, -hop);
      g.fillStyle = col;                                  // body
      rr(g, -13, 4, 26, 24, 6); g.fill();
      g.fillStyle = "#4a6b3a"; rr(g, -13, 20, 26, 8, 3); g.fill();   // shorts
      g.fillStyle = col;                                  // head
      circle(g, 0, -8, 15);
      triangle(g, -14, -14, -24, -22, -12, -4);           // ears
      triangle(g, 14, -14, 24, -22, 12, -4);
      g.fillStyle = "#20351a";                             // nose
      triangle(g, 0, -8, -4, -1, 4, -1);
      g.fillStyle = "#ffe9e9"; circle(g, -6, -12, 3.4); circle(g, 6, -12, 3.4);
      g.fillStyle = "#111"; circle(g, -5, -12, 1.7); circle(g, 7, -12, 1.7);
      g.strokeStyle = "#111"; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-8, -2); g.quadraticCurveTo(0, 3, 8, -2); g.stroke();
      g.fillStyle = "#fff"; g.fillRect(-3, -1, 2, 3); g.fillRect(2, -1, 2, 3);
      // dagger
      g.fillStyle = "#9aa5b5"; g.save(); g.translate(18, 12); g.rotate(.6); g.fillRect(0, -2, 16, 4); g.restore();
      g.fillStyle = "#5e4126"; g.fillRect(14, 10, 6, 5);
      g.restore();
    },
    wolf(g, t, col) {
      const breathe = Math.sin(t / 500) * 1.5;
      g.fillStyle = "rgba(0,0,0,.25)"; ellipse(g, 0, 34, 34, 7);
      g.fillStyle = col;
      ellipse(g, 4, 8 + breathe, 26, 14);                 // body
      // legs
      g.fillRect(-14, 18, 6, 16); g.fillRect(14, 18, 6, 16);
      g.fillStyle = shade(col, -.2); g.fillRect(-14, 30, 6, 4); g.fillRect(14, 30, 6, 4);
      // tail
      g.strokeStyle = col; g.lineWidth = 7; g.lineCap = "round";
      g.beginPath(); g.moveTo(24, 2); g.quadraticCurveTo(38, -6, 36, -16); g.stroke();
      // head
      g.fillStyle = col; circle(g, -18, -6 + breathe, 13);
      triangle(g, -26, -14, -30, -26, -20, -16); triangle(g, -12, -14, -8, -26, -18, -16);
      g.fillStyle = shade(col, .15); ellipse(g, -27, -2 + breathe, 8, 6);
      g.fillStyle = "#111"; circle(g, -31, -2, 2.5);
      g.fillStyle = "#ffdf6d"; circle(g, -20, -8, 2.6); circle(g, -13, -8, 2.6);
      g.strokeStyle = "#fff"; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(-33, 3); g.lineTo(-24, 5); g.moveTo(-33, 6); g.lineTo(-24, 6); g.stroke();
    },
    skeleton(g, t, col) {
      const sway = Math.sin(t / 600) * 2;
      g.save(); g.translate(sway, 0);
      g.fillStyle = "rgba(0,0,0,.25)"; ellipse(g, 0, 36, 20, 6);
      g.strokeStyle = col; g.lineWidth = 5; g.lineCap = "round";
      // spine & ribs
      g.beginPath(); g.moveTo(0, -6); g.lineTo(0, 22); g.stroke();
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-9, 0 + i * 6); g.lineTo(9, 0 + i * 6); g.stroke(); }
      // arms
      g.beginPath(); g.moveTo(-9, -2); g.lineTo(-18, 12); g.moveTo(9, -2); g.lineTo(20, 8); g.stroke();
      // legs
      g.beginPath(); g.moveTo(-2, 22); g.lineTo(-9, 38); g.moveTo(2, 22); g.lineTo(9, 38); g.stroke();
      // skull
      g.fillStyle = col; circle(g, 0, -16, 12);
      g.fillRect(-8, -10, 16, 7);
      g.fillStyle = "#1c1c28"; circle(g, -5, -17, 3.6); circle(g, 5, -17, 3.6);
      g.fillStyle = "#ff4d4d"; circle(g, -5, -17, 1.6); circle(g, 5, -17, 1.6);
      g.fillStyle = "#1c1c28"; g.fillRect(-1, -13, 2, 4);
      g.strokeStyle = "#1c1c28"; g.lineWidth = 1;
      for (let i = -6; i <= 6; i += 4) { g.beginPath(); g.moveTo(i, -6); g.lineTo(i, -3); g.stroke(); }
      // rusty sword
      g.fillStyle = "#8a8f7a"; g.save(); g.translate(20, 8); g.rotate(-.8); g.fillRect(0, -2, 20, 4); g.restore();
      g.restore();
    },
    orc(g, t, col) {
      const stomp = Math.abs(Math.sin(t / 420)) * 2;
      g.fillStyle = "rgba(0,0,0,.28)"; ellipse(g, 0, 38, 28, 7);
      g.save(); g.translate(0, -stomp);
      g.fillStyle = col;
      rr(g, -18, -2, 36, 28, 8); g.fill();               // bulky torso
      g.fillStyle = shade(col, -.15); rr(g, -18, 18, 36, 10, 4); g.fill();
      // arms
      g.fillStyle = col; rr(g, -26, 0, 9, 20, 4); g.fill(); rr(g, 17, 0, 9, 20, 4); g.fill();
      // head
      circle(g, 0, -14, 14);
      g.fillStyle = shade(col, -.2);                      // jaw
      rr(g, -9, -10, 18, 9, 4); g.fill();
      g.fillStyle = "#f5f0dc";                            // tusks
      triangle(g, -7, -3, -5, 4, -3, -3); triangle(g, 3, -3, 5, 4, 7, -3);
      g.fillStyle = "#ffd23e"; circle(g, -6, -16, 2.8); circle(g, 6, -16, 2.8);
      g.fillStyle = "#111"; circle(g, -6, -16, 1.2); circle(g, 6, -16, 1.2);
      // axe
      g.save(); g.translate(24, 6); g.rotate(.4);
      g.fillStyle = "#5e4126"; g.fillRect(-2, -18, 4, 30);
      g.fillStyle = "#9aa5b5";
      g.beginPath(); g.moveTo(2, -16); g.quadraticCurveTo(18, -12, 14, 0); g.quadraticCurveTo(8, -4, 2, -2); g.fill();
      g.restore();
      g.restore();
    },
    bandit(g, t, col) {
      const bob = Math.sin(t / 450) * 2;
      g.fillStyle = "rgba(0,0,0,.25)"; ellipse(g, 0, 36, 20, 6);
      g.save(); g.translate(0, bob);
      g.fillStyle = "#3a3a4a"; rr(g, -12, 0, 24, 26, 6); g.fill();     // cloak body
      g.fillStyle = col; circle(g, 0, -12, 12);                        // hood/head
      g.fillStyle = "#2c2c38";
      g.beginPath(); g.arc(0, -14, 12, Math.PI, 0); g.lineTo(12, -8); g.lineTo(-12, -8); g.fill();
      g.fillStyle = "#ffe9b0"; circle(g, -4, -9, 2.4); circle(g, 4, -9, 2.4);
      g.fillStyle = "#111"; g.fillRect(-6, -4, 12, 2);                 // mask line
      // coin in hand
      g.fillStyle = "#ffd94a"; circle(g, 16, 12, 5);
      g.fillStyle = "#c9a225"; circle(g, 16, 12, 2);
      // dagger
      g.fillStyle = "#c8ccd6"; g.save(); g.translate(-16, 10); g.rotate(-.7); g.fillRect(-10, -2, 14, 4); g.restore();
      g.restore();
    },
    warlord(g, t, col) {
      const pulse = 1 + Math.sin(t / 300) * .03;
      g.save(); g.scale(pulse, pulse);
      g.fillStyle = "rgba(0,0,0,.35)"; ellipse(g, 0, 42, 34, 8);
      // cape
      g.fillStyle = "#5a1616";
      g.beginPath();
      g.moveTo(-20, -18); g.quadraticCurveTo(-40, 20, -30, 42);
      g.lineTo(30, 42); g.quadraticCurveTo(40, 20, 20, -18); g.closePath(); g.fill();
      // armored body
      g.fillStyle = "#4a4f5e"; rr(g, -18, -4, 36, 32, 8); g.fill();
      g.fillStyle = "#666d80"; rr(g, -18, -4, 36, 8, 4); g.fill();
      g.fillStyle = col; g.fillRect(-3, 4, 6, 20);                    // emblem stripe
      // arms
      g.fillStyle = "#4a4f5e"; rr(g, -27, -2, 9, 24, 4); g.fill(); rr(g, 18, -2, 9, 24, 4); g.fill();
      // horned helm
      g.fillStyle = "#3c4150"; circle(g, 0, -20, 15);
      g.fillStyle = "#22262f"; g.fillRect(-15, -22, 30, 8);            // visor
      g.fillStyle = col;
      triangle(g, -13, -28, -26, -44, -8, -32); triangle(g, 13, -28, 26, -44, 8, -32);
      g.fillStyle = "#ff3b3b"; circle(g, -6, -18, 2.6); circle(g, 6, -18, 2.6);
      // greatsword
      g.save(); g.translate(30, 10); g.rotate(.5);
      g.fillStyle = "#5e4126"; g.fillRect(-3, 6, 6, 16);
      g.fillStyle = "#aab4c8";
      g.beginPath(); g.moveTo(-5, 6); g.lineTo(5, 6); g.lineTo(4, -34); g.lineTo(0, -40); g.lineTo(-4, -34); g.closePath(); g.fill();
      g.fillStyle = "#ff6b6b"; g.fillRect(-5, 4, 10, 3);
      g.restore();
      g.restore();
    },
  };

  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  function ellipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }
  function triangle(g, x1, y1, x2, y2, x3, y3) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x3, y3); g.closePath(); g.fill(); }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, gg = (n >> 8) & 255, b = n & 255;
    r = clamp(Math.round(r + r * amt), 0, 255); gg = clamp(Math.round(gg + gg * amt), 0, 255); b = clamp(Math.round(b + b * amt), 0, 255);
    return `rgb(${r},${gg},${b})`;
  }

  // ---------- battle instance ----------
  function create(player, enemies, opts = {}) {
    return {
      player,
      enemies: enemies.map((key, i) => {
        const m = Data.MONSTERS[key];
        return { key, def: m, name: m.name, hp: m.hp, maxHp: m.hp, alive: true, statuses: {}, flash: 0, shake: 0, phase: i * .8 };
      }),
      boss: !!opts.boss,
      onWin: opts.onWin,
      phase: "intro",              // intro | menu | target | anim | msg | victory | defeat | flee
      menu: "main",                // main | skill | item
      cursor: 0,
      subCursor: 0,
      msgQueue: [],
      turnOrder: null,
      pendingAction: null,
      timer: 0,
      time: 0,
      bgStars: Array.from({ length: 40 }, () => ({ x: Math.random() * 640, y: Math.random() * 480, r: Math.random() * 1.6 + .4 })),
      reward: null,
      fled: false,
      poisonTick: 0,
    };
  }

  function queueMsg(b, text, next) { b.msgQueue.push({ text, next }); }

  function aliveEnemies(b) { return b.enemies.filter(e => e.alive); }

  function startTurn(b) {
    const p = b.player, st = Data.stats(p);
    const units = [{ who: "player", spd: st.spd + randInt(0, 4) }];
    for (const e of aliveEnemies(b)) units.push({ who: e, spd: e.def.spd + randInt(0, 4) + (e.statuses.slow ? -4 : 0) });
    units.sort((a, b2) => b2.spd - a.spd);
    b.turnOrder = units;
    b.turnIdx = 0;
    nextTurn(b);
  }

  function nextTurn(b) {
    // clear defeated from order
    while (b.turnIdx < b.turnOrder.length) {
      const u = b.turnOrder[b.turnIdx++];
      if (u.who === "player") {
        if (b.player.hp > 0) { openPlayerMenu(b); return; }
        continue;
      }
      if (u.who.alive) { enemyAct(b, u.who); return; }
    }
    // end of round: poison ticks
    let acted = false;
    if (b.player.hp > 0 && b.player.statuses?.poison) {
      const dmg = Math.max(3, Math.floor(b.player.maxHp * .05));
      b.player.hp = Math.max(1, b.player.hp - dmg);
      queueMsg(b, `${b.player.name} suffers poison! (-${dmg} HP)`); acted = true;
    }
    for (const e of aliveEnemies(b)) if (e.statuses.poison) {
      const d = Math.max(2, Math.floor(e.maxHp * .04)); e.hp -= d; e.flash = 8;
      if (e.hp <= 0) killEnemy(b, e); 
    }
    if (checkEnd(b)) return;
    startTurn(b);
  }

  function openPlayerMenu(b) { b.phase = "menu"; b.menu = "main"; b.cursor = 0; }

  function playerAttack(b, target, mult = 1, label = "attacks!") {
    const st = Data.stats(b.player);
    const crit = Math.random() < .1;
    let dmg = Math.max(1, Math.floor((st.atk * mult * (crit ? 2 : 1)) - target.def.def * .6 + randInt(-2, 4)));
    target.hp -= dmg; target.flash = 10; target.shake = 8;
    queueMsg(b, `${b.player.name} ${label}${crit ? " CRITICAL!" : ""} ${target.name} takes ${dmg} damage.`);
    if (target.hp <= 0) killEnemy(b, target);
    endPlayerTurn(b);
  }

  function playerSkill(b, skId, target) {
    const sk = Data.SKILLS[skId], p = b.player;
    p.mp -= sk.mp;
    if (sk.type === "heal") {
      const amt = sk.power + randInt(0, 10);
      p.hp = Math.min(p.maxHp, p.hp + amt);
      queueMsg(b, `${b.player.name} casts ${sk.name}! Restored ${amt} HP.`);
      endPlayerTurn(b); return;
    }
    if (sk.type === "phys") { playerAttack(b, target, sk.power, `uses ${sk.name} on`); return; }
    // magic damage ignores half DEF
    const st = Data.stats(p);
    const dmg = Math.max(1, Math.floor(st.atk * .5 + sk.power + randInt(0, 8) - target.def.def * .5));
    target.hp -= dmg; target.flash = 12; target.shake = 10;
    queueMsg(b, `${b.player.name} casts ${sk.name}! ${target.name} takes ${dmg} damage.`);
    if (target.hp <= 0) killEnemy(b, target);
    endPlayerTurn(b);
  }

  function useItemBattle(b, itemId, target) {
    const it = Data.ITEMS[itemId], p = b.player;
    Data.removeItem(p, itemId);
    if (it.kind === "heal" || it.kind === "both") {
      const amt = it.kind === "both" ? p.maxHp : it.power;
      p.hp = Math.min(p.maxHp, p.hp + amt);
      queueMsg(b, `Used ${it.name}. ${p.name} recovers ${amt} HP!`);
    } else if (it.kind === "mp") {
      p.mp = Math.min(p.maxMp, p.mp + it.power);
      queueMsg(b, `Used ${it.name}. MP restored.`);
    } else if (it.kind === "cure") {
      p.statuses.poison = false;
      queueMsg(b, `Used ${it.name}. Poison cleansed.`);
    }
    endPlayerTurn(b);
  }

  function killEnemy(b, e) {
    e.alive = false; e.hp = 0;
    queueMsg(b, `${e.name} is defeated!`);
  }

  function enemyAct(b, e) {
    const p = b.player;
    // boss enrage
    let mult = 1;
    if (e.def.enrageAt && e.hp < e.maxHp * e.def.enrageAt && !e.enraged) {
      e.enraged = true;
      queueMsg(b, `${e.name} flies into a RAGE! Attack rises!`);
      e.atkBoost = 8;
    }
    const atk = e.def.atk + (e.atkBoost || 0);
    const sk = e.def.skill;
    if (sk && Math.random() < sk.chance) {
      if (sk.effect === "poison" && !p.statuses.poison) {
        const dmg = Math.max(1, atk - Data.stats(p).def * .5 + randInt(-2, 3)) | 0;
        p.hp = Math.max(1, p.hp - dmg); p.statuses.poison = true; b.playerFlash = 10;
        queueMsg(b, `${e.name} uses ${sk.name}! ${p.name} takes ${dmg} and is POISONED!`);
      } else if (sk.effect === "spdDown") {
        p.statuses.spdDown = true;
        queueMsg(b, `${e.name} uses ${sk.name}! Your feet grow sluggish...`);
      } else if (sk.effect === "steal") {
        const loot = Math.min(p.gold, randInt(5, 25));
        p.gold -= loot;
        queueMsg(b, loot > 0 ? `${e.name} uses ${sk.name}! Stole ${loot} gold!` : `${e.name} tries to steal but finds nothing!`);
      } else if (sk.mult) {
        const dmg = Math.max(1, Math.floor(atk * sk.mult - Data.stats(p).def * .6 + randInt(-2, 4)));
        p.hp = Math.max(0, p.hp - dmg); b.playerFlash = 12;
        queueMsg(b, `${e.name} uses ${sk.name}! ${p.name} takes ${dmg} damage!`);
      }
    } else {
      const dmg = Math.max(1, Math.floor(atk * mult - Data.stats(p).def * .6 + randInt(-2, 4)));
      p.hp = Math.max(0, p.hp - dmg); b.playerFlash = 10;
      queueMsg(b, `${e.name} attacks! ${p.name} takes ${dmg} damage.`);
    }
    if (p.statuses.spdDown && Math.random() < .4) p.statuses.spdDown = false;
    after(b);   // waiting phase → pump shows msg automatically
  }

  function after(b) {
    if (checkEnd(b)) return;
    b.phase = "waiting";   // loop calls pump() → shows first queued msg
  }

  // player spent a turn: after the action messages finish, continue the round
  function endPlayerTurn(b) {
    if (checkEnd(b)) return;
    b.afterMsgsGoToNextTurn = true;
    b.phase = "waiting";
  }

  function pump(b) {
    if (b.phase !== "waiting") return;
    if (b.msgQueue.length) { b.currentMsg = b.msgQueue.shift().text; b.phase = "msg"; }
    else if (b.afterMsgsGoToNextTurn) { b.afterMsgsGoToNextTurn = false; nextTurn(b); }
    else nextTurn(b);
  }

  function checkEnd(b) {
    if (b.player.hp <= 0) { b.phase = "defeat"; return true; }
    if (aliveEnemies(b).length === 0) {
      // tally rewards
      let xp = 0, gold = 0;
      for (const e of b.enemies) { xp += e.def.xp; gold += e.def.gold; }
      b.reward = { xp, gold };
      b.player.gold += gold;
      const msgs = Data.gainXp(b.player, xp);
      b.victoryLines = [`Victory!`, `+${xp} XP   +${gold} gold`, ...msgs];
      b.phase = "victory"; b.victoryIdx = 0;
      return true;
    }
    return false;
  }

  function advanceMsg(b) {
    while (b.msgQueue.length) {
      const m = b.msgQueue.shift();
      if (m.text === "") { b.phase = "waiting"; return; }   // sentinel → pump decides
      b.currentMsg = m.text; b.phase = "msg"; return;
    }
    b.phase = "waiting";
    pump(b);
  }

  function begin(b) {
    b.currentMsg = b.boss ? "Grimfang the Warlord bars your path!" : "Monsters appear!";
    b.phase = "msg";
    b.pendingStart = true;
  }

  // called when first message dismissed → roll initiative
  function startCombat(b) { b.pendingStart = false; startTurn(b); }

  return { create, begin, advanceMsg, startCombat, pump, ART, aliveEnemies,
    playerAttack, playerSkill, useItemBattle, queueMsg, checkEnd };
})();
