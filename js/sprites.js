// ---- procedural pixel-art sprites (no external assets) ----
const Sprites = (() => {

  // make an offscreen canvas from a color-string grid; '.' = transparent
  function fromGrid(grid, scale = 2, palette = null) {
    const h = grid.length, w = grid[0].length;
    const c = document.createElement("canvas");
    c.width = w * scale; c.height = h * scale;
    const x = c.getContext("2d");
    for (let r = 0; r < h; r++) {
      for (let col = 0; col < w; col++) {
        const ch = grid[r][col];
        if (ch === "." || ch === " ") continue;
        x.fillStyle = palette ? palette[ch] : ch;
        x.fillRect(col * scale, r * scale, scale, scale);
      }
    }
    return c;
  }

  // ---------- characters ----------
  // Build hero/NPC sprite frames: [dir][frame] dirs: down, up, left, right
  function humanoid(opts) {
    const P = {
      hair: opts.hair, skin: opts.skin, cloth: opts.cloth, trim: opts.trim || "#ffffff",
      boot: opts.boot || "#4a3220", eye: "#1c1c28", belt: opts.belt || "#3a2a18"
    };
    const S = 3; // pixel scale
    const W = 12 * S, H = 16 * S;

    function frame(dir, step) {
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const g = c.getContext("2d");
      const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x * S, y * S, w * S, h * S); };

      const legOff = step === 1 ? 1 : step === 3 ? -1 : 0;
      // legs (one raised while walking)
      const lY = 12, lH = 4;
      const la = legOff === 1 ? 1 : 0, lb = legOff === -1 ? 1 : 0;
      px(4, lY, 2, lH - la, P.boot);
      px(7, lY, 2, lH - lb, P.boot);

      // body / tunic
      px(3, 7, 7, 5, P.cloth);
      px(3, 11, 7, 1, P.trim);           // hem
      px(4, 9, 5, 1, P.belt);            // belt
      // arms
      px(2, 7, 1, 4, P.cloth); px(9, 7, 1, 4, P.cloth);
      px(2, 11, 1, 1, P.skin); px(9, 11, 1, 1, P.skin);

      // head
      px(3, 2, 7, 5, P.skin);
      // hair top & sides
      px(3, 1, 7, 2, P.hair);
      if (dir !== 1) { // not facing up
        px(3, 2, 1, 3, P.hair); px(9, 2, 1, 3, P.hair); // side locks
      } else {
        px(3, 2, 7, 3, P.hair); // back of head fully hair
      }
      // face details
      if (dir === 0) { // down
        px(5, 4, 1, 1, P.eye); px(7, 4, 1, 1, P.eye);
        px(5, 6, 3, 1, "rgba(0,0,0,.12)");
      } else if (dir === 2) { // left
        px(4, 4, 1, 1, P.eye);
      } else if (dir === 3) { // right
        px(8, 4, 1, 1, P.eye);
      }
      return c;
    }
    const dirs = [frame(0, 0), frame(1, 0), frame(2, 0), frame(3, 0)];
    const walk = [
      [frame(0, 1), frame(0, 0), frame(0, 3), frame(0, 0)],
      [frame(1, 1), frame(1, 0), frame(1, 3), frame(1, 0)],
      [frame(2, 1), frame(2, 0), frame(2, 3), frame(2, 0)],
      [frame(3, 1), frame(3, 0), frame(3, 3), frame(3, 0)],
    ];
    return { idle: dirs, walk };
  }

  // ---------- tiles ----------
  function tileCanvas(painter) {
    const c = document.createElement("canvas");
    c.width = TILE; c.height = TILE;
    painter(c.getContext("2d"), mulberry32(painter.seed || 1));
    return c;
  }

  function grassTile(base, speck) {
    return (g, rnd) => {
      g.fillStyle = base; g.fillRect(0, 0, TILE, TILE);
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(rnd() * TILE), y = Math.floor(rnd() * TILE);
        g.fillStyle = rnd() < .5 ? speck : "rgba(255,255,255,.05)";
        g.fillRect(x, y, 2, 2);
      }
      // occasional grass tuft
      if (rnd() < .3) {
        const x = 4 + Math.floor(rnd() * 20), y = 8 + Math.floor(rnd() * 16);
        g.strokeStyle = "rgba(20,80,30,.55)"; g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x, y + 6); g.lineTo(x - 2, y);
        g.moveTo(x + 3, y + 6); g.lineTo(x + 3, y - 2);
        g.moveTo(x + 6, y + 6); g.lineTo(x + 8, y);
        g.stroke();
      }
    };
  }

  function pathTile() {
    return (g, rnd) => {
      g.fillStyle = "#b9a06a"; g.fillRect(0, 0, TILE, TILE);
      g.fillStyle = "rgba(0,0,0,.08)";
      for (let i = 0; i < 10; i++) g.fillRect(Math.floor(rnd() * 30), Math.floor(rnd() * 30), 3, 2);
      g.fillStyle = "rgba(255,255,255,.12)";
      for (let i = 0; i < 6; i++) g.fillRect(Math.floor(rnd() * 30), Math.floor(rnd() * 30), 2, 2);
      // edge blend
      g.fillStyle = "rgba(90,130,60,.25)";
      if (rnd() < .5) g.fillRect(0, 0, TILE, 2); else g.fillRect(0, 30, TILE, 2);
    };
  }

  function waterTile() {
    return (g, rnd) => {
      const grd = g.createLinearGradient(0, 0, 0, TILE);
      grd.addColorStop(0, "#2f6ea8"); grd.addColorStop(1, "#245a8c");
      g.fillStyle = grd; g.fillRect(0, 0, TILE, TILE);
      g.strokeStyle = "rgba(255,255,255,.28)"; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const y = 6 + i * 10 + rnd() * 3;
        g.beginPath();
        g.moveTo(2 + rnd() * 4, y);
        g.quadraticCurveTo(TILE / 2, y - 3, TILE - 2 - rnd() * 4, y);
        g.stroke();
      }
    };
  }

  function treeTile() {
    return (g) => {
      // trunk
      g.fillStyle = "#5e4126"; g.fillRect(13, 20, 6, 11);
      g.fillStyle = "rgba(0,0,0,.2)"; g.fillRect(17, 20, 2, 11);
      // canopy blobs
      const leaf = ["#2c7a3f", "#35914c", "#41a85b"];
      const blob = (cx, cy, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); };
      blob(16, 13, 12, leaf[0]);
      blob(11, 10, 8, leaf[1]);
      blob(21, 9, 8, leaf[1]);
      blob(16, 6, 7, leaf[2]);
      blob(13, 12, 5, leaf[2]);
      g.fillStyle = "rgba(0,0,0,.15)";
      blob(16, 20, 9, "rgba(0,0,0,.12)");
    };
  }

  function rockTile() {
    return (g) => {
      g.fillStyle = "#7d8899"; 
      g.beginPath();
      g.moveTo(4, 28); g.lineTo(8, 12); g.lineTo(18, 6); g.lineTo(28, 14); g.lineTo(26, 28);
      g.closePath(); g.fill();
      g.fillStyle = "#9aa5b5";
      g.beginPath(); g.moveTo(8, 12); g.lineTo(18, 6); g.lineTo(22, 13); g.lineTo(12, 18); g.closePath(); g.fill();
      g.fillStyle = "rgba(0,0,0,.25)";
      g.fillRect(10, 20, 3, 2); g.fillRect(18, 16, 4, 2);
    };
  }

  function flowerTile(colors) {
    return (g, rnd) => {
      for (let i = 0; i < 4; i++) {
        const x = 4 + Math.floor(rnd() * 22), y = 6 + Math.floor(rnd() * 20);
        g.fillStyle = "#2f7a3d"; g.fillRect(x + 1, y + 2, 1, 4);
        g.fillStyle = choice ? colors[i % colors.length] : "#ff6b81";
        g.fillRect(x, y, 3, 3);
        g.fillStyle = "#ffe66d"; g.fillRect(x + 1, y + 1, 1, 1);
      }
    };
  }

  function houseTile(kind) {
    return (g) => {
      if (kind === "wall") {
        g.fillStyle = "#c9b48a"; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "rgba(0,0,0,.08)";
        g.fillRect(0, 15, TILE, 1); g.fillRect(0, 31, TILE, 1);
        g.fillRect(15, 0, 1, 15); g.fillRect(31, 16, 1, 16);
      } else if (kind === "roof") {
        g.fillStyle = "#a34a3a"; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "rgba(0,0,0,.15)";
        for (let y = 0; y < TILE; y += 8) g.fillRect(0, y + 7, TILE, 1);
        g.fillStyle = "rgba(255,255,255,.08)";
        for (let y = 0; y < TILE; y += 8) g.fillRect(0, y, TILE, 1);
      } else if (kind === "door") {
        g.fillStyle = "#c9b48a"; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "#5e4126"; rr(g, 8, 6, 16, 26, 4); g.fill();
        g.fillStyle = "#7a5a38"; rr(g, 10, 8, 12, 22, 3); g.fill();
        g.fillStyle = "#ffd94a"; g.fillRect(19, 18, 3, 3);
      } else if (kind === "window") {
        g.fillStyle = "#c9b48a"; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "#3f6f9f"; g.fillRect(7, 8, 18, 14);
        g.strokeStyle = "#5e4126"; g.lineWidth = 2;
        g.strokeRect(7, 8, 18, 14);
        g.beginPath(); g.moveTo(16, 8); g.lineTo(16, 22); g.moveTo(7, 15); g.lineTo(25, 15); g.stroke();
        g.fillStyle = "rgba(255,255,255,.25)"; g.fillRect(9, 10, 5, 3);
      }
    };
  }

  function signTile() {
    return (g) => {
      g.fillStyle = "#5e4126"; g.fillRect(14, 16, 4, 14);
      g.fillStyle = "#8a6a42"; rr(g, 4, 4, 24, 14, 3); g.fill();
      g.fillStyle = "#6b4f2d"; g.fillRect(7, 8, 18, 2); g.fillRect(7, 12, 12, 2);
    };
  }

  function chestTile(open) {
    return (g) => {
      g.fillStyle = "#7a5a34"; rr(g, 4, 10, 24, 18, 3); g.fill();
      g.fillStyle = open ? "#4c3a22" : "#8f6b3f";
      if (!open) { rr(g, 4, 6, 24, 10, 4); g.fill(); }
      else { g.fillStyle = "#3a2c1a"; g.fillRect(6, 8, 20, 6); g.fillStyle = "#ffe66d"; g.globalAlpha = .5; g.fillRect(8, 9, 16, 4); g.globalAlpha = 1; }
      g.fillStyle = "#caa65a"; g.fillRect(4, 16, 24, 3);
      g.fillStyle = "#ffd94a"; g.fillRect(14, 16, 4, 6);
      g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(15, 19, 2, 2);
    };
  }

  function bedTile() {
    return (g) => {
      g.fillStyle = "#6b4f2d"; g.fillRect(2, 4, 28, 26);
      g.fillStyle = "#d94f5c"; g.fillRect(4, 10, 24, 20);
      g.fillStyle = "#ffffff"; g.fillRect(4, 4, 24, 8);
      g.fillStyle = "rgba(0,0,0,.15)"; g.fillRect(4, 26, 24, 4);
    };
  }

  function potTile() {
    return (g) => {
      g.fillStyle = "#8a5a3a";
      g.beginPath(); g.ellipse(16, 20, 9, 8, 0, 0, 7); g.fill();
      g.fillStyle = "#a06a44";
      g.beginPath(); g.ellipse(16, 13, 7, 4, 0, 0, 7); g.fill();
      g.fillStyle = "#5e3d26"; g.fillRect(9, 12, 14, 2);
    };
  }

  function saveCrystalTile() {
    return (g) => {
      g.fillStyle = "rgba(120,200,255,.18)";
      g.beginPath(); g.arc(16, 20, 12, 0, 7); g.fill();
      g.fillStyle = "#7fd4ff";
      g.beginPath();
      g.moveTo(16, 4); g.lineTo(24, 16); g.lineTo(16, 28); g.lineTo(8, 16); g.closePath(); g.fill();
      g.fillStyle = "#d7f3ff";
      g.beginPath(); g.moveTo(16, 4); g.lineTo(20, 15); g.lineTo(16, 22); g.lineTo(12, 15); g.closePath(); g.fill();
    };
  }

  function portalTile() {
    return (g) => {
      const grd = g.createRadialGradient(16, 16, 2, 16, 16, 16);
      grd.addColorStop(0, "#e9d5ff"); grd.addColorStop(.5, "#a855f7"); grd.addColorStop(1, "#4c1d95");
      g.fillStyle = grd; g.beginPath(); g.arc(16, 16, 14, 0, 7); g.fill();
      g.strokeStyle = "rgba(255,255,255,.7)"; g.lineWidth = 2;
      g.beginPath(); g.arc(16, 16, 8, 0, 4); g.stroke();
    };
  }

  // ---------- monsters (battle portraits drawn procedurally in battle.js) ----------
  const cache = {};
  function getHeroSprites() {
    if (!cache.hero) cache.hero = humanoid({ hair: "#6b3f22", skin: "#f0c090", cloth: "#3f7fbf", trim: "#e8c86a", boot: "#4a3220" });
    return cache.hero;
  }
  function getNpcSprites(variant) {
    const key = "npc" + variant;
    if (!cache[key]) {
      const presets = [
        { hair: "#2b2b35", skin: "#eab888", cloth: "#4fae62", trim: "#dff5e1" },       // elder green
        { hair: "#d9d9d9", skin: "#e8c0a0", cloth: "#8a8fa8", trim: "#ffffff" },       // grandma grey
        { hair: "#7a4a1f", skin: "#f0c090", cloth: "#b5651d", trim: "#e8c86a" },       // merchant brown
        { hair: "#3a3a4a", skin: "#e0b080", cloth: "#6d7b8f", trim: "#c0c8d8" },       // guard steel
        { hair: "#111118", skin: "#d9a06b", cloth: "#5e3a7a", trim: "#c9a2ff" },       // mage purple
      ];
      cache[key] = humanoid(presets[variant % presets.length]);
    }
    return cache[key];
  }

  return { humanoid, getHeroSprites, getNpcSprites,
    tiles: {
      grassA: grassTile("#4c8c4a", "#3f7a3f"),
      grassB: grassTile("#549a52", "#468a44"),
      tallGrass: (g, rnd) => { grassTile("#4c8c4a", "#3f7a3f")(g, rnd);
        g.strokeStyle = "#2f6a33"; g.lineWidth = 2;
        for (let i = 0; i < 5; i++) { const x = 4 + i * 6; g.beginPath(); g.moveTo(x, 30); g.quadraticCurveTo(x + 2, 20, x - 1, 12); g.stroke(); } },
      path: pathTile(),
      water: waterTile(),
      tree: treeTile(),
      rock: rockTile(),
      flowers: flowerTile(["#ff6b81", "#ffd94a", "#c084fc", "#ff9f68"]),
      wall: houseTile("wall"),
      roof: houseTile("roof"),
      door: houseTile("door"),
      window: houseTile("window"),
      sign: signTile(),
      chest: chestTile(false),
      chestOpen: chestTile(true),
      bed: bedTile(),
      pot: potTile(),
      crystal: saveCrystalTile(),
      portal: portalTile(),
      floorWood: (g) => { g.fillStyle = "#8a6a42"; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, 15, TILE, 1); g.fillRect(0, 31, TILE, 1); g.fillRect(10, 0, 1, 16); g.fillRect(22, 16, 1, 16); },
      floorStone: (g) => { g.fillStyle = "#8f96a3"; g.fillRect(0, 0, TILE, TILE);
        g.strokeStyle = "rgba(0,0,0,.2)"; g.strokeRect(1, 1, 15, 15); g.strokeRect(17, 1, 14, 15); g.strokeRect(1, 17, 15, 14); g.strokeRect(17, 17, 14, 14); },
      caveFloor: (g, rnd) => { g.fillStyle = "#3a3542"; g.fillRect(0, 0, TILE, TILE);
        for (let i = 0; i < 12; i++) { g.fillStyle = rnd() < .5 ? "#443e4e" : "#322d3a"; g.fillRect(Math.floor(rnd() * 30), Math.floor(rnd() * 30), 3, 2); } },
      caveWall: (g, rnd) => { g.fillStyle = "#221f29"; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "#2c2836";
        g.fillRect(2, 2, 12, 12); g.fillRect(18, 8, 12, 14); g.fillRect(6, 20, 14, 10);
        g.fillStyle = "rgba(0,0,0,.4)"; g.fillRect(0, 0, TILE, 2); g.fillRect(0, 0, 2, TILE); },
      lava: (g, rnd) => { const grd = g.createLinearGradient(0, 0, 0, TILE);
        grd.addColorStop(0, "#ff7a1a"); grd.addColorStop(1, "#d33f0a");
        g.fillStyle = grd; g.fillRect(0, 0, TILE, TILE);
        g.fillStyle = "rgba(255,220,80,.5)";
        for (let i = 0; i < 4; i++) g.fillRect(Math.floor(rnd() * 28), Math.floor(rnd() * 28), 4, 2); },
    }
  };
})();
