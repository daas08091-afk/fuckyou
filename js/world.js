// ---- maps, tiles & collision ----
const World = (() => {

  // Tile kinds. solid = blocks movement. encounter = random-battle zone weight.
  const T = {
    ".":  { name: "grassA", solid: false },
    ",":  { name: "grassB", solid: false },
    "t":  { name: "tallGrass", solid: false, encounter: 10 },
    "#":  { name: "path", solid: false },
    "~":  { name: "water", solid: true },
    "T":  { name: "tree", solid: true },
    "R":  { name: "rock", solid: true },
    "f":  { name: "flowers", solid: false },
    "W":  { name: "wall", solid: true },
    "r":  { name: "roof", solid: true },
    "D":  { name: "door", solid: false, special: "door" },
    "n":  { name: "window", solid: true },
    "s":  { name: "sign", solid: true, special: "sign" },
    "c":  { name: "chest", solid: true, special: "chest" },
    "o":  { name: "chestOpen", solid: true, special: "chestOpen" },
    "b":  { name: "bed", solid: true, special: "bed" },
    "p":  { name: "pot", solid: true, special: "pot" },
    "S":  { name: "crystal", solid: false, special: "save" },
    "P":  { name: "portal", solid: false, special: "portal" },
    "F":  { name: "floorWood", solid: false },
    "L":  { name: "floorStone", solid: false },
    "d":  { name: "caveFloor", solid: false, encounter: 16 },
    "X":  { name: "caveWall", solid: true },
    "v":  { name: "lava", solid: true },
  };

  // helper to pad/validate rows
  function build(rows) {
    const w = Math.max(...rows.map(r => r.length));
    const grid = rows.map(r => (r + ".".repeat(w - r.length)).split(""));
    return { w, h: grid.length, grid };
  }

  // =================== MAPS ===================
  const maps = {};

  // --- Village of Emberhollow (start) ---
  maps.village = build([
    "TTTT..,,,,...ttt....~~~~~~....rrrrrr........",
    "TT...,##,,.,ttt.....~~~~~~~~...rWWWWWr...,,..",
    "T,..f.##,,,.,,,.....~~~..~~~...rWWWWWWr.,,,..",
    "..,.f.##,,,,,,......~~....~~...rrWWWWrr..,,..",
    ",,...##,,,,,,,,.....~~....~~....ff..ff.....,,",
    ",,,.###,,,,,,,,,....~~~~~~~~....ss..TT.....,,",
    "...##S##,,,,,,,,.....~~~~~~................,,",
    "..###..###,,,,,,............b.p.......,,,,,,,",
    ".##......##,,,,,....rrrrrrrrFFbbFFpp,,,.,,,,,",
    ",#.######.##,,,,....rWWWWWWWFFFFFFF,,,,,,.,,,",
    ",.#......#,.,,,.....rWWWDWWWFFFFFFp,,,,,,,,,,",
    ",.######.,,,,,,,....rrWWWWWW,FFF...,.,,,,,,,,",
    ",#......#,,,,,,,,....ff..ff,,F,,,,,,,,,,,,,,,",
    "##,,f,,##,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,P,",
    "#,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "##,,,,,,,,#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ".##,,,,,,,,#,,,,,,,,,,,,,,,,,,,,tt,,,,,,,,,,,,",
    "..###,,,,,,,#,,,,,,,,,,,,,,,,,,tttt,,,,,,,,,,,",
    "...#,,,,,,,,#,,,,,,,,,,,,,,,,,tttt,,,,,,,,,,,,",
    "...#,,,,,,,,,,,,,,,,,,,,,,,,,,,ttt,,,,,,,,,,,,",
    "..##,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "..#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ".##,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "###,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "#,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "##,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "###,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "#####,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "######,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "#######,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "########,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ]);;;;
  maps.village.name = "Emberhollow Village";
  maps.village.bg = "forest";
  maps.village.encounterRate = 0;
  maps.village.npcs = [
    { id: "elder", variant: 0, x: 9, y: 8, dir: 0, name: "Elder Maren",
      lines: [
        "The Shadowroot has awakened beneath the eastern mountain...",
        "Goblin scouts grow bold. The old portal in the square still hums with power.",
        "Take this — a Hero's Charm. May it keep your feet swift. Speak to me again whenever you need healing; the village tends its own."
      ],
      gift: { item: "charm" }, heal: true },
    { id: "guard", variant: 3, x: 24, y: 12, dir: 2, name: "Guard Tomas",
      lines: [
        "Traveler! The road east is crawling with goblins and wolves.",
        "Rest at the crystal before you go — it will record your journey.",
        "And mind the lava deeper in the mountain. It minds nothing at all."
      ] },
    { id: "merchant", variant: 2, x: 15, y: 12, dir: 0, name: "Peddler Nyx",
      lines: ["Wares, wares! Best prices this side of the Shadowroot!"], shop: true },
    { id: "girl", variant: 1, x: 5, y: 15, dir: 3, name: "Lily",
      lines: [
        "My grandma says heroes used to visit our village every year.",
        "Are you a hero? You look like a hero!",
        "I found a shiny coin near the well... here, you can have it! You need it more than me!"
      ], gift: { gold: 30 } },
  ];
  maps.village.signs = { "32,5": "← EMBERHOLLOW SQUARE\nEast: The King's Road →\nNE: Shadowmount Cave ⚠" };
  maps.village.chests = { "39,7": { gold: 25 } };
  maps.village.portalTo = "road";
  maps.village.portalSpawns = { road: { x: 1, y: 13 } };
  maps.village.savePoint = { x: 5, y: 6 };

  // --- King's Road (wilderness) ---
  maps.road = build([
    "T..,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    "T,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,ttt,,,,,,,,,,,,,,,,,tttt,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,tttt,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,R,,,,,,,,,,,,RR,,,,,,,,,,,,,,,,,,,,,,,R",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
    ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,",
  ]);
  // carve the connecting paths
  // vertical path from left exit down, horizontal middle path, up to cave on right
  for (let y = 0; y < 16; y++) maps.road.grid[y][1] = "#";
  for (let x = 1; x < 44; x++) maps.road.grid[16][x] = "#";
  for (let y = 16; y < 32; y++) maps.road.grid[y][44] = "#";
  // pond & trees decoration
  for (let y = 6; y < 10; y++) for (let x = 20; x < 26; x++) maps.road.grid[y][x] = "~";
  for (let y = 22; y < 26; y++) for (let x = 8; x < 13; x++) maps.road.grid[y][x] = "t";
  maps.road.grid[24][30] = "R"; maps.road.grid[8][33] = "R";
  maps.road.grid[4][35] = "T"; maps.road.grid[5][36] = "T";
  maps.road.grid[20][18] = "f"; maps.road.grid[27][12] = "f";
  maps.road.grid[3][3] = "c";                       // chest
  maps.road.name = "The King's Road";
  maps.road.bg = "road";
  maps.road.encounterRate = 9;                      // per-step chance %
  maps.road.encounters = ["goblin", "wolf", "slime", "bandit"];
  maps.road.chests = { "3,3": { item: "potion2" } };
  maps.road.leftExit = { to: "village", x: 43, y: 13 };
  maps.road.bottomExit = { to: "cave", x: 44, y: 1 };

  // --- Shadowmount Cave ---
  maps.cave = build([
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "X.....d......XX.....dd.....XX....d............X",
    "X.dd###dd.....XX...dddd....XX..dd..vvvv.......X",
    "X....#........X..dddddddd....X.d....vvvv......X",
    "X....#...RR...X..dd##ddd....XXd......vv......XX",
    "X....#####....X.dd#dd..#dd..XX.......vv.....ddX",
    "X.........#...X.dd#....#dd..XX.............dd#X",
    "X.dd......#...XXXX######XXXXX...cccc....dd#...X",
    "X.dd........................X..........#.....X",
    "X.XXXX..XX..XXXX....XXXXXX...XXXXXX..XXX......X",
    "X....d....dd....d..d......d.d......d..d......XX",
    "X..cc..........dd...dd..dd...dd...dd.........#X",
    "X.............................................X",
    "X..XXXXXX..XXXX....XXXXXX...XXXX....XXXXXX....X",
    "X..d....d..d..d....d....d...d..d....d....d....X",
    "X..d.c..d..d.dd....d.cc.d...d..d....d.cc.d....X",
    "X..d....d..d.......d....d...d.......d.........X",
    "X..XXXXXX..X.......XXXXXX...X.......X.........X",
    "X..........d......................dd..........X",
    "X..........dd.....dd...dd......dddd...........X",
    "X..vv......dd....dddd.dddd....dddddd....SS....X",
    "X.vvvv........................dddddd..........X",
    "X.vvvv....RR................P.dddddd..........X",
    "X.vv........................LLLLLL...........XX",
    "X.........................LLLLLLLLLL.........XXX",
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  ]);;
  // top entrance shaft from road
  for (let y = 1; y <= 6; y++) maps.cave.grid[y][5] = "#";
  maps.cave.grid[0][5] = "d"; // walkable entry row inside wall line? keep X border but open tile
  maps.cave.grid[0][5] = "d";
  maps.cave.name = "Shadowmount Cave";
  maps.cave.bg = "cave";
  maps.cave.encounterRate = 13;
  maps.cave.encounters = ["bat", "spider", "goblin", "skeleton", "orc"];
  maps.cave.bossAt = { x: 28, y: 22 };
  maps.cave.chests = {
    "3,11": { gold: 60 }, "32,7": { item: "potion" },
    "5,15": { item: "ironSword" }, "21,15": { gold: 40 },
    "38,15": { item: "steelShield" }, "22,15": { item: "elixir" },
  };
  maps.cave.topExit = { to: "road", x: 44, y: 30 };
  maps.cave.savePoint = { x: 40, y: 20 };
  maps.cave.bossTrigger = "warlord";

  return {
    T, maps,
    get(id) { return maps[id]; },
    tileAt(map, tx, ty) {
      if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return T["X"];
      return T[map.grid[ty][tx]] || T["."];
    },
    isSolid(map, tx, ty) { return this.tileAt(map, tx, ty).solid; },
    // collision check for entity box (px coords)
    canWalk(map, px, py, w, h) {
      const pts = [
        [px, py + h * 0.55], [px + w, py + h * 0.55],
        [px, py + h * 0.95], [px + w, py + h * 0.95],
      ];
      for (const [x, y] of pts) {
        const t = this.tileAt(map, Math.floor(x / TILE), Math.floor(y / TILE));
        if (t.solid) return false;
      }
      return true;
    },
  };
})();
