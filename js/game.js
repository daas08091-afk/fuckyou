// ---- main game loop, input, scene management ----
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // ---------------- state ----------------
  const G = {
    scene: "title",            // title | world | battle | dialog | shop | inventory | gameover | ending
    player: null,
    mapId: "village",
    px: 0, py: 0,              // player pixel pos (feet center)
    dir: 0, frame: 0, animT: 0, moving: false,
    camX: 0, camY: 0,
    battle: null,
    dlg: null,                 // {lines, idx, speaker, after}
    shopCursor: 0,
    invCursor: 0, invTab: "items",
    fade: 0, fadeDir: 0, fadeNext: null,
    toastText: "", toastT: 0,
    time: 0, steps: 0,
    chestOpened: {},           // "map,x,y" -> true
    npcGifted: {},
    bossDead: false,
    titleCursor: 0,
    keys: {},
    pressed: {},
    particles: [],
  };

  const SAVE_KEY = "emberwood_save_v1";

  function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  function saveGame() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        player: G.player, mapId: G.mapId, px: G.px, py: G.py,
        chestOpened: G.chestOpened, npcGifted: G.npcGifted, bossDead: G.bossDead, steps: G.steps,
      }));
      toast("Journey recorded ✦");
    } catch (e) { toast("Could not save :("); }
  }
  function loadGame() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!d) return false;
      G.player = d.player; G.mapId = d.mapId; G.px = d.px; G.py = d.py;
      G.chestOpened = d.chestOpened || {}; G.npcGifted = d.npcGifted || {};
      G.bossDead = !!d.bossDead; G.steps = d.steps || 0;
      G.player.statuses = {};
      return true;
    } catch (e) { return false; }
  }

  function newGame() {
    G.player = Data.makePlayer();
    G.mapId = "village";
    G.px = 8 * TILE + 16; G.py = 14 * TILE + 24;
    G.chestOpened = {}; G.npcGifted = {}; G.bossDead = false; G.steps = 0;
    updateChestTiles();
    G.dlg = {
      speaker: "", lines: [
        "The village of Emberhollow lies uneasy. Strange lights rise from Shadowmount to the east...",
        "You are Aldric, wandering sword-for-hire. The Elder in the square surely needs you.",
        "(Move with WASD or Arrows. Press E near people and things. Open your pack with I.)"
      ], idx: 0,
    };
    G.scene = "world";
  }

  function toast(t) { G.toastText = t; G.toastT = 2.2; }

  // replace opened chests on grid so they render open & stay solid
  function updateChestTiles() {
    for (const key of Object.keys(G.chestOpened)) {
      const [map, x, y] = key.split(",");
      if (map === G.mapId && World.maps[map]) World.maps[map].grid[y][x] = "o";
    }
  }

  // ---------------- input ----------------
  window.addEventListener("keydown", e => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "f5", "f8"].includes(k) || (e.key === "")) e.preventDefault();
    if (!G.keys[k]) G.pressed[k] = true;
    G.keys[k] = true;
    handleKey(k, e);
  });
  window.addEventListener("keyup", e => { G.keys[e.key.toLowerCase()] = false; });

  function down(...ks) { return ks.some(k => G.keys[k]); }
  function hit(...ks) { return ks.some(k => G.pressed[k]); }

  function handleKey(k, e) {
    if (k === "f5") { if (G.scene === "world") saveGame(); return; }
    if (k === "f8") { if (G.scene === "world" || G.scene === "title") { if (loadGame()) { updateChestTiles(); G.scene = "world"; toast("Journey restored."); } else toast("No saved journey."); } return; }

    switch (G.scene) {
      case "title": {
        const opts = ["new", ...(hasSave() ? ["continue"] : [])];
        if (hit("arrowup", "arrowdown", "w", "s")) G.titleCursor = (G.titleCursor + 1) % opts.length;
        if (hit("enter", "e", " ")) {
          if (opts[G.titleCursor] === "continue") {
            if (loadGame()) { updateChestTiles(); startWorld(true); }
          } else { newGame(); }
        }
        break;
      }
      case "world":
        if (hit("i")) { G.invCursor = 0; G.scene = "inventory"; }
        break;
      case "dialog":
        if (hit("e", " ", "enter")) advanceDialog();
        break;
      case "inventory":
        if (hit("i", "escape")) { G.scene = "world"; break; }
        {
          const list = invList();
          if (hit("arrowup", "w")) G.invCursor = Math.max(0, G.invCursor - 1);
          if (hit("arrowdown", "s")) G.invCursor = Math.min(list.length - 1, G.invCursor + 1);
          if (hit("arrowleft", "arrowright", "a", "d")) G.invTab = G.invTab === "items" ? "equip" : "items", G.invCursor = 0;
          if (hit("e", "enter") && list[G.invCursor]) useOrEquip(list[G.invCursor]);
        }
        break;
      case "shop":
        if (hit("i", "escape", "q")) { G.scene = "world"; break; }
        {
          const stock = shopStock();
          if (hit("arrowup", "w")) G.shopCursor = Math.max(0, G.shopCursor - 1);
          if (hit("arrowdown", "s")) G.shopCursor = Math.min(stock.length - 1, G.shopCursor + 1);
          if (hit("e", "enter")) buyItem(stock[G.shopCursor]);
        }
        break;
      case "battle": battleKey(k); break;
      case "gameover":
        if (hit("e", "enter", " ")) revive();
        break;
      case "ending":
        if (hit("e", "enter", " ")) G.scene = "title";
        break;
    }
  }

  function revive() {
    if (hasSave() && loadGame()) { G.player.hp = Math.max(1, Math.floor(G.player.maxHp / 2)); }
    else { G.player.hp = Math.max(1, Math.floor(G.player.maxHp / 2)); }
    G.mapId = "village";
    G.px = 8 * TILE + 16; G.py = 14 * TILE + 24;
    G.goldLost = Math.floor(G.player.gold / 4);
    G.player.gold -= G.goldLost;
    updateChestTiles();
    G.scene = "world";
    say([`You wake in Emberhollow, tended by village hands. You lost ${G.goldLost} gold in your sleep...`, "The Elder's healing touch restores your strength."], "...", () => {
      G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp;
    });
  }
  function startWorld(fromSave) { G.scene = "world"; updateChestTiles(); }

  // ---------------- dialogue ----------------
  function advanceDialog() {
    const d = G.dlg;
    if (!d) { G.scene = "world"; return; }
    d.idx++;
    if (d.idx >= d.lines.length) {
      const after = d.after;
      G.dlg = null; G.scene = "world";
      if (after) after();
    }
  }
  function say(lines, speaker, after) {
    G.dlg = { lines: Array.isArray(lines) ? lines : [lines], idx: 0, speaker, after };
    G.scene = "dialog";
  }

  // ---------------- interaction ----------------
  function facingTile() {
    const d = [[0, 1], [0, -1], [-1, 0], [1, 0]][G.dir];
    return { x: Math.floor(G.px / TILE) + d[0], y: Math.floor((G.py - 10) / TILE) + d[1] };
  }

  function interact() {
    const map = World.maps[G.mapId];
    const ft = facingTile();
    const key = `${G.mapId},${ft.x},${ft.y}`;

    // NPC within reach?
    for (const n of (map.npcs || [])) {
      const nx = n.x * TILE + 16, ny = n.y * TILE + 24;
      if (dist(nx, ny, G.px, G.py) < 46) { talkTo(n); return; }
    }

    const tile = World.tileAt(map, ft.x, ft.y);
    const sp = tile.special;
    if (sp === "sign") {
      const txt = (map.signs || {})[`${ft.x},${ft.y}`];
      if (txt) say(txt.split("\n").join("   "), "Signpost");
      return;
    }
    if (sp === "chest" || sp === "chestOpen") {
      if (G.chestOpened[key]) { say("The chest is empty."); return; }
      const loot = (map.chests || {})[`${ft.x},${ft.y}`];
      G.chestOpened[key] = true;
      map.grid[ft.y][ft.x] = "o";
      let msg = "You open the chest... ";
      if (loot?.gold) { G.player.gold += loot.gold; msg += `found ${loot.gold} gold!`; }
      if (loot?.item) { Data.addItem(G.player, loot.item); msg += `found ${Data.ITEMS[loot.item].name}!`; }
      if (!loot) msg += "nothing but dust.";
      say(msg);
      sparkle(ft.x * TILE + 16, ft.y * TILE + 16);
      return;
    }
    if (sp === "save") {
      say(["The crystal hums warmly...", "Your journey is recorded."], "Saving Crystal", () => saveGame());
      return;
    }
    if (sp === "bed") {
      if (G.player.hp === G.player.maxHp && G.player.mp === G.player.maxMp) { say("You're already fully rested."); return; }
      G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp; G.player.statuses = {};
      say("You rest a while. HP & MP fully restored. ✦");
      return;
    }
    if (sp === "pot") {
      say("An honest clay pot. You bow respectfully and leave it be.");
      return;
    }
    if (sp === "door") {
      say("Locked. Someone must be inside, but the door won't budge.");
      return;
    }
    if (sp === "portal") {
      const dest = map.portalTo;
      if (dest) {
        const spawn = (map.portalSpawns || {})[dest] || { x: 1, y: 1 };
        travelTo(dest, { x: spawn.x * TILE + 16, y: spawn.y * TILE + 24 }, `The portal shimmers... ${World.maps[dest].name}.`);
      }
      return;
    }
  }

  function talkTo(n) {
    // face each other
    const dx = n.x * TILE + 16 - G.px, dy = n.y * TILE + 24 - G.py;
    G.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 3) : (dy > 0 ? 1 : 0);

    let lines = [...n.lines];
    const giftedKey = `${G.mapId}:${n.id}`;
    let gift = null;
    if (n.gift && !G.npcGifted[giftedKey]) {
      gift = n.gift;
      G.npcGifted[giftedKey] = true;
    }
    if (gift) {
      if (gift.item) { Data.addItem(G.player, gift.item); }
      if (gift.gold) { G.player.gold += gift.gold; }
    }
    const after = () => {
      if (n.heal) { G.player.hp = G.player.maxHp; G.player.mp = G.player.maxMp; toast("Elder Maren heals you ✦"); }
      if (n.shop) { G.shopCursor = 0; G.scene = "shop"; }
    };
    say(lines, n.name, after);
  }

  function shopStock() { return ["potion", "potion2", "ether", "antidote", "elixir", "ironSword", "steelShield"]; }
  function buyItem(id) {
    if (!id) return;
    const d = Data.ITEMS[id];
    if (G.player.gold < d.price) { toast("Not enough gold!"); return; }
    G.player.gold -= d.price;
    Data.addItem(G.player, id);
    toast(`Bought ${d.name}`);
  }

  function invList() {
    return G.player.inventory.filter(it => {
      const kind = Data.ITEMS[it.id].kind;
      return G.invTab === "equip" ? (kind === "weapon" || kind === "armor" || kind === "acc")
                                 : !(kind === "weapon" || kind === "armor" || kind === "acc");
    });
  }
  function useOrEquip(entry) {
    const d = Data.ITEMS[entry.id];
    if (G.invTab === "equip") {
      const slot = d.kind === "weapon" ? "weapon" : d.kind === "armor" ? "armor" : "acc";
      for (const it of G.player.inventory) if (it.equipped === slot) it.equipped = null;
      entry.equipped = slot;
      toast(`Equipped ${d.name}`);
    } else {
      if (G.player.hp === G.player.maxHp && G.player.mp === G.player.maxMp && d.kind !== "cure") { toast("Already at full health."); return; }
      applyFieldItem(entry, d);
    }
  }
  function applyFieldItem(entry, d) {
    const p = G.player;
    if (d.kind === "heal" || d.kind === "both") p.hp = Math.min(p.maxHp, p.hp + (d.kind === "both" ? p.maxHp : d.power));
    if (d.kind === "mp" || d.kind === "both") p.mp = Math.min(p.maxMp, p.mp + (d.kind === "both" ? p.maxMp : d.power));
    if (d.kind === "cure") p.statuses.poison = false;
    Data.removeItem(p, entry.id);
    toast(`Used ${d.name}`);
    G.invCursor = Math.min(G.invCursor, Math.max(0, invList().length - 1));
  }

  // ---------------- travel & encounters ----------------
  function travelTo(dest, spawnPos, msg) {
    G.fadeDir = 1;
    G.fadeNext = () => {
      G.mapId = dest;
      G.px = spawnPos.x; G.py = spawnPos.y;
      updateChestTiles();
      if (msg) toast(msg);
    };
  }

  function checkEdgeExit() {
    const map = World.maps[G.mapId];
    const tx = Math.floor(G.px / TILE), ty = Math.floor((G.py - 10) / TILE);
    if (G.mapId === "village" && tx >= map.w - 1) {
      travelTo("road", { x: 1 * TILE + 16, y: 13 * TILE + 24 }); return true;
    }
    if (G.mapId === "road" && tx <= 0 && ty < 16) {
      travelTo("village", { x: (map.w - 2) * TILE + 16, y: 13 * TILE + 24 }); return true;
    }
    if (G.mapId === "road" && ty >= map.h - 1 && tx >= 42) {
      travelTo("cave", { x: 5 * TILE + 16, y: 1 * TILE + 24 }); return true;
    }
    if (G.mapId === "cave" && ty <= 0 && tx >= 4 && tx <= 6) {
      travelTo("road", { x: 44 * TILE + 16, y: (World.maps.road.h - 2) * TILE + 24 }); return true;
    }
    return false;
  }

  function maybeEncounter() {
    const map = World.maps[G.mapId];
    if (!map.encounterRate) return;
    G.steps++;
    if (G.steps % 1 !== 0) return;
    const chance = map.encounterRate / 100;
    if (Math.random() < chance) {
      const groupSize = Math.random() < .55 ? 1 : (Math.random() < .75 ? 2 : 3);
      const group = [];
      for (let i = 0; i < groupSize; i++) group.push(choice(map.encounters));
      startBattle(group, false);
    }
  }

  function checkBossTrigger() {
    if (G.mapId !== "cave" || G.bossDead) return;
    const b = World.maps.cave.bossAt;
    if (dist(b.x * TILE + 16, b.y * TILE + 16, G.px, G.py) < 30) {
      G.bossDead = "pending";
      say([
        "A mountain of scarred iron and malice rises from the gloom.",
        "\"ANOTHER LITTLE HERO?\" Grimfang the Warlord laughs like a collapsing mine. \"COME THEN.\"",
      ], "???", () => startBattle(["warlord"], true));
    }
  }

  function startBattle(group, boss) {
    G.battle = Battle.create(G.player, group, { boss });
    Battle.begin(G.battle);
    G.scene = "battle";
  }

  // ---------------- battle input ----------------
  function battleKey(k) {
    const b = G.battle;
    if (!b) { G.scene = "world"; return; }
    if (b.phase === "msg" || b.phase === "waiting") {
      if (hit("e", "enter", " ")) {
        if (b.pendingStart) { Battle.startCombat(b); return; }
        if (b.fled) { G.battle = null; G.scene = "world"; return; }
        if (b.menuReturn) { b.menuReturn = false; b.phase = "menu"; b.menu = "main"; b.cursor = 0; return; }
        Battle.advanceMsg(b);
      }
      Battle.pump(b);
      return;
    }
    if (b.phase === "victory") {
      if (hit("e", "enter", " ")) {
        b.victoryIdx++;
        if (b.victoryIdx >= b.victoryLines.length) endBattle(true);
      }
      return;
    }
    if (b.phase === "defeat") {
      if (hit("e", "enter", " ")) { G.scene = "gameover"; }
      return;
    }
    if (b.phase === "menu") {
      if (b.menu === "main") {
        if (hit("arrowleft", "a")) b.cursor = (b.cursor + 3) % 4;
        if (hit("arrowright", "d")) b.cursor = (b.cursor + 1) % 4;
        if (hit("arrowup", "w")) b.cursor = (b.cursor + 2) % 4;
        if (hit("arrowdown", "s")) b.cursor = (b.cursor + 2) % 4;
        if (hit("e", "enter", " ")) {
          if (b.cursor === 0) { b.pendingAction = { type: "attack" }; pickTarget(b); }
          else if (b.cursor === 1) { b.menu = "skill"; b.cursor = 0; }
          else if (b.cursor === 2) { b.menu = "item"; b.cursor = 0; }
          else tryFlee(b);
        }
      } else if (b.menu === "skill") {
        const n = b.player.skills.length;
        if (hit("arrowup", "w")) b.cursor = (b.cursor + n - 1) % n;
        if (hit("arrowdown", "s")) b.cursor = (b.cursor + 1) % n;
        if (hit("escape", "q")) { b.menu = "main"; b.cursor = 0; }
        if (hit("e", "enter")) {
          const skId = b.player.skills[b.cursor], sk = Data.SKILLS[skId];
          if (b.player.mp < sk.mp) { toast2(b, "Not enough MP!"); return; }
          if (sk.type === "heal") { Battle.playerSkill(b, skId, null); }
          else { b.pendingAction = { type: "skill", skId }; pickTarget(b); }
        }
      } else if (b.menu === "item") {
        const usable = usableItems(b);
        const n = Math.max(1, usable.length);
        if (hit("arrowup", "w")) b.cursor = (b.cursor + n - 1) % n;
        if (hit("arrowdown", "s")) b.cursor = (b.cursor + 1) % n;
        if (hit("escape", "q")) { b.menu = "main"; b.cursor = 0; }
        if (hit("e", "enter") && usable[b.cursor]) {
          const it = usable[b.cursor];
          Battle.useItemBattle(b, it.id, null);
        }
      }
      return;
    }
    if (b.phase === "target") {
      const alive = Battle.aliveEnemies(b);
      if (hit("arrowleft", "a")) b.subCursor = (b.subCursor + alive.length - 1) % alive.length;
      if (hit("arrowright", "d")) b.subCursor = (b.subCursor + 1) % alive.length;
      if (hit("escape", "q")) { b.phase = "menu"; b.menu = "main"; b.pendingAction = null; }
      if (hit("e", "enter", " ")) {
        const target = alive[b.subCursor % alive.length];
        const act = b.pendingAction;
        if (act?.type === "attack") Battle.playerAttack(b, target);
        else if (act?.type === "skill") Battle.playerSkill(b, act.skId, target);
        b.pendingAction = null;
      }
    }
  }
  function usableItems(b) { return b.player.inventory.filter(it => ["heal", "mp", "both", "cure"].includes(Data.ITEMS[it.id].kind)); }
  function pickTarget(b) { b.subCursor = 0; b.phase = "target"; }
  function toast2(b, msg) { b.currentMsg = msg; b.phase = "msg"; b.menuReturn = true; }
  function tryFlee(b) {
    if (b.boss) { b.currentMsg = "There is no escape from Grimfang!"; b.phase = "msg"; b.menuReturn = true; return; }
    const st = Data.stats(b.player);
    const fastest = Math.max(...Battle.aliveEnemies(b).map(e => e.def.spd));
    if (Math.random() < .5 + (st.spd - fastest) * .04) {
      b.currentMsg = "You slip away into the underbrush!";
      b.phase = "msg"; b.fled = true;
    } else {
      b.currentMsg = "Couldn't escape! The enemy strikes as you turn...";
      b.phase = "msg"; b.afterMsgsGoToNextTurn = true;   // continue round → enemies act
    }
  }

  function endBattle(won) {
    const b = G.battle;
    G.battle = null;
    if (b.fled || won) {
      if (b.boss) {
        G.bossDead = true;
        World.maps.cave.grid[22][28] = "L"; // boss gone from the arena
        say([
          "Grimfang falls with a clang like a cathedral bell.",
          "The mountain exhales. Somewhere far above, birds begin to sing again.",
          "Emberhollow is safe. Your name will be told in its taverns for a hundred years.",
          "— THE END —  (press E)",
        ], "Victory", () => { G.scene = "ending"; });
        G.scene = "dialog";
        return;
      }
    }
    if (won && b.pendingFleeFail) { /* enemy already acted */ }
    G.scene = "world";
    G.player.statuses = {};   // statuses don't persist outside battle except poison cleared here
  }

  // ---------------- particles ----------------
  function sparkle(x, y) {
    for (let i = 0; i < 14; i++) {
      G.particles.push({ x, y, vx: (Math.random() - .5) * 90, vy: -Math.random() * 110 - 20, life: .8 + Math.random() * .4, col: choice(["#ffd94a", "#fff3b0", "#ffe9a8"]) });
    }
  }

  // ---------------- world update ----------------
  function worldUpdate(dt) {
    if (!G.player.statuses) G.player.statuses = {};
    const speed = 140 * (Data.stats(G.player).spd / 7) * (G.player.statuses.spdDown ? .7 : 1);
    let mx = 0, my = 0;
    if (down("arrowup", "w")) { my = -1; G.dir = 1; }
    if (down("arrowdown", "s")) { my = 1; G.dir = 0; }
    if (down("arrowleft", "a")) { mx = -1; G.dir = 2; }
    if (down("arrowright", "d")) { mx = 1; G.dir = 3; }
    G.moving = !!(mx || my);
    if (G.moving) {
      const len = Math.hypot(mx, my);
      const nx = G.px + (mx / len) * speed * dt;
      const ny = G.py + (my / len) * speed * dt;
      const map = World.maps[G.mapId];
      const W = 18, H = 14;
      if (World.canWalk(map, nx - W / 2, ny - H, W, H)) G.px = nx;
      if (World.canWalk(map, G.px - W / 2, ny - H, W, H)) G.py = ny;
      G.animT += dt;
      if (G.animT > .12) { G.animT = 0; G.frame = (G.frame + 1) % 4; }
      // step-based encounter roll (throttled by distance)
      stepAccum += speed * dt;
      if (stepAccum > TILE) { stepAccum = 0; maybeEncounter(); checkBossTrigger(); }
    } else { G.frame = 0; }

    checkEdgeExit();
  }
  let stepAccum = 0;

  function cameraUpdate(dt) {
    const map = World.maps[G.mapId];
    const tw = map.w * TILE, th = map.h * TILE;
    const tx = clamp(G.px - 320, 0, Math.max(0, tw - 640));
    const ty = clamp(G.py - 240, 0, Math.max(0, th - 480));
    G.camX = lerp(G.camX, tx, Math.min(1, dt * 8));
    G.camY = lerp(G.camY, ty, Math.min(1, dt * 8));
  }

  // ---------------- world draw ----------------
  function worldDraw() {
    const map = World.maps[G.mapId];
    UI.drawMap(ctx, map, G.camX, G.camY);

    // NPCs
    for (const n of (map.npcs || [])) {
      const sheet = Sprites.getNpcSprites(n.variant);
      const px = n.x * TILE + 16 - G.camX, py = n.y * TILE + 26 - G.camY;
      UI.drawCharacter(ctx, sheet, n.dir ?? 0, 0, px, py);
      // interaction hint
      if (dist(n.x * TILE + 16, n.y * TILE + 24, G.px, G.py) < 46) {
        UI.bubble(ctx, "E", px, py - 46);
        drawText(ctx, n.name, px, py - 66, { size: 11, align: "center", color: "#ffe9a8", bold: true });
      }
    }

    // boss marker (before defeat)
    if (G.mapId === "cave" && !G.bossDead && G.bossDead !== "pending") {
      const b = World.maps.cave.bossAt;
      const px = b.x * TILE + 16 - G.camX, py = b.y * TILE + 26 - G.camY;
      ctx.fillStyle = "rgba(255,60,60,.25)";
      ctx.beginPath(); ctx.arc(px, py - 10, 20 + Math.sin(G.time * 4) * 3, 0, 7); ctx.fill();
      drawText(ctx, "☠", px, py - 34, { size: 20, align: "center", color: "#ff6b6b" });
    }

    // player
    const sheet = Sprites.getHeroSprites();
    UI.drawCharacter(ctx, sheet, G.dir, G.moving ? G.frame : 0, G.px - G.camX, G.py - G.camY);

    // particles
    for (const p of G.particles) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x - G.camX - 2, p.y - G.camY - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // cave darkness vignette
    if (G.mapId === "cave") {
      const g = ctx.createRadialGradient(G.px - G.camX, G.py - G.camY, 60, G.px - G.camX, G.py - G.camY, 320);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,10,.68)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 640, 480);
    }

    UI.hud(ctx, G.player, map.name);

    if (G.toastT > 0) UI.toast(ctx, G.toastText, Math.min(1, G.toastT * 2));

    if (G.scene === "dialog" && G.dlg) UI.dialog(ctx, G.dlg.lines, G.dlg.idx, G.dlg.speaker, G.dlg.idx < G.dlg.lines.length - 1);
    if (G.scene === "inventory") UI.inventoryScreen(ctx, G.player, G.invCursor, G.invTab);
    if (G.scene === "shop") UI.shopScreen(ctx, G.player, shopStock(), G.shopCursor, G.player.gold);

    if (G.fade > 0) UI.fadeOverlay(ctx, G.fade);
  }

  function endingDraw() {
    ctx.fillStyle = "#0a0d14"; ctx.fillRect(0, 0, 640, 480);
    const t = G.time;
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % 640, y = ((i * 53) - t * 20 * ((i % 3) + 1)) % 480;
      ctx.fillStyle = `rgba(255,220,120,${.2 + (i % 5) * .1})`;
      ctx.fillRect(x, y < 0 ? y + 480 : y, 2, 2);
    }
    drawText(ctx, "✦  EMBERWOOD IS SAFE  ✦", 320, 140, { size: 26, align: "center", bold: true, color: "#e8c86a" });
    drawText(ctx, "Grimfang the Warlord has fallen.", 320, 200, { size: 15, align: "center", color: "#cfe3ff" });
    drawText(ctx, `Steps taken: ${G.steps} · Final level: ${G.player.level} · Gold: ${G.player.gold}`, 320, 230, { size: 13, align: "center", color: "#9fb4d8" });
    drawText(ctx, "Thank you for playing!", 320, 300, { size: 16, align: "center", color: "#ffe9a8" });
    const blink = Math.floor(t * 2.5) % 2;
    if (blink) drawText(ctx, "Press E to return to the title", 320, 380, { size: 13, align: "center", color: "#8fa0bf" });
  }

  function gameoverDraw() {
    ctx.fillStyle = "#12060a"; ctx.fillRect(0, 0, 640, 480);
    drawText(ctx, "YOU HAVE FALLEN", 320, 170, { size: 34, align: "center", bold: true, color: "#e05252" });
    drawText(ctx, hasSave() ? "The saving crystal flickers... it can restore you." : "But every tale deserves another telling.", 320, 230, { size: 14, align: "center", color: "#cfe3ff" });
    const blink = Math.floor(G.time * 2.5) % 2;
    if (blink) drawText(ctx, hasSave() ? "Press E — revive from last save" : "Press E — try again", 320, 300, { size: 14, align: "center", color: "#ffe9a8" });
  }

  // ---------------- main loop ----------------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    G.time += dt;
    if (G.toastT > 0) G.toastT -= dt;

    // fade transitions
    if (G.fadeDir === 1) {
      G.fade = Math.min(1, G.fade + dt * 3);
      if (G.fade >= 1) { if (G.fadeNext) { G.fadeNext(); G.fadeNext = null; } G.fadeDir = -1; }
    } else if (G.fadeDir === -1) {
      G.fade = Math.max(0, G.fade - dt * 2);
      if (G.fade <= 0) G.fadeDir = 0;
    }

    // particles always update
    for (const p of G.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.life -= dt; }
    G.particles = G.particles.filter(p => p.life > 0);

    if (G.scene === "battle" && G.battle) {
      const bb = G.battle;
      if (bb.phase === "waiting") { bb.waitT = (bb.waitT || 0) + dt; if (bb.waitT > .25) { bb.waitT = 0; Battle.pump(bb); } }
      if (bb.phase === "msg" && !bb.pendingStart && !bb.fled && !bb.menuReturn) { bb.msgT = (bb.msgT || 0) + dt; if (bb.msgT > 1.15) { bb.msgT = 0; Battle.advanceMsg(bb); } }
      else bb.msgT = 0;
      bb.time = now;
      for (const e of G.battle.enemies) { if (e.flash > 0) e.flash -= dt * 30; if (e.shake > 0) e.shake -= dt * 40; }
      if (G.battle.playerFlash > 0) G.battle.playerFlash -= dt * 30;
    }

    ctx.clearRect(0, 0, 640, 480);
    switch (G.scene) {
      case "title": UI.titleScreen(ctx, now, hasSave()); break;
      case "world":
        if (G.fadeDir === 0) worldUpdate(dt);
        cameraUpdate(dt);
        worldDraw();
        break;
      case "dialog":
        cameraUpdate(dt);
        worldDraw();
        break;
      case "inventory": worldDraw(); break;
      case "shop": worldDraw(); break;
      case "battle":
        if (G.battle) UI.drawBattle(ctx, G.battle, now);
        break;
      case "gameover": gameoverDraw(); break;
      case "ending": endingDraw(); break;
    }

    // clear single-frame presses
    G.pressed = {};
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // expose for debugging/tests
  window.__G = G;
  window.__game = { interact, startBattle, say, revive, travelTo };
})();
