// ---- items, monsters, player state ----
const Data = (() => {

  const ITEMS = {
    potion:     { name: "Potion",        kind: "heal", power: 40,  price: 30, desc: "Restores 40 HP." },
    potion2:    { name: "Hi-Potion",     kind: "heal", power: 120, price: 90, desc: "Restores 120 HP." },
    ether:      { name: "Ether",         kind: "mp",   power: 20,  price: 60, desc: "Restores 20 MP." },
    elixir:     { name: "Elixir",        kind: "both", power: 999, price: 300, desc: "Fully restores HP & MP." },
    antidote:   { name: "Salve",         kind: "cure", price: 20, desc: "Cures poison." },
    charm:      { name: "Hero's Charm",  kind: "acc",  spd: 4, luck: 3, price: 0, desc: "+SPD +LUCK. A villager's gift." },
    ironSword:  { name: "Iron Sword",    kind: "weapon", atk: 8,  price: 120, desc: "ATK +8. Found in the cave." },
    steelShield:{ name: "Steel Shield",  kind: "armor",  def: 7,  price: 110, desc: "DEF +7. Cave-forged." },
    leatherArmor:{ name: "Leather Armor", kind: "armor",  def: 3,  price: 55, desc: "DEF +3." },
    bronzeSword:{ name: "Bronze Sword",  kind: "weapon", atk: 4,  price: 45, desc: "ATK +4. A hero's start." },
  };

  const SKILLS = {
    fireball: { name: "Fireball", mp: 6,  power: 26, type: "dmg", desc: "Hurl searing flame." },
    heal:     { name: "Heal",     mp: 5,  power: 45, type: "heal", desc: "Mend wounds with light." },
    thunder:  { name: "Thunder",  mp: 10, power: 40, type: "dmg", desc: "Call a crackling bolt." },
    smash:    { name: "Power Smash", mp: 4, power: 1.7, type: "phys", desc: "A heavy strike (1.7x ATK)." },
  };

  // monster templates; art = procedural draw key
  const MONSTERS = {
    slime:    { name: "Gloop",       hp: 30,  atk: 7,  def: 2,  spd: 3,  xp: 12,  gold: 8,   art: "slime",    color: "#5ad16b" },
    bat:      { name: "Dark Bat",    hp: 24,  atk: 9,  def: 1,  spd: 12, xp: 14,  gold: 6,   art: "bat",      color: "#8b7ab8", skill: { name: "Screech", chance: .25, effect: "spdDown" } },
    spider:   { name: "Cave Spider", hp: 34,  atk: 10, def: 3,  spd: 8,  xp: 20,  gold: 12,  art: "spider",   color: "#a0522d", skill: { name: "Venom Bite", chance: .35, effect: "poison" } },
    goblin:   { name: "Goblin",      hp: 42,  atk: 11, def: 4,  spd: 7,  xp: 24,  gold: 18,  art: "goblin",   color: "#6fae57" },
    wolf:     { name: "Timber Wolf", hp: 48,  atk: 13, def: 4,  spd: 10, xp: 28,  gold: 15,  art: "wolf",     color: "#8f9aa8", skill: { name: "Savage Fangs", chance: .3, mult: 1.6 } },
    skeleton: { name: "Skeleton",    hp: 58,  atk: 15, def: 6,  spd: 6,  xp: 38,  gold: 25,  art: "skeleton", color: "#ddd8c8" },
    orc:      { name: "Orc Brute",   hp: 80,  atk: 18, def: 8,  spd: 5,  xp: 55,  gold: 35,  art: "orc",      color: "#4f7a4a", skill: { name: "Cleaving Blow", chance: .3, mult: 1.8 } },
    bandit:   { name: "Road Bandit", hp: 55,  atk: 14, def: 5,  spd: 9,  xp: 40,  gold: 45,  art: "bandit",   color: "#7a5a3a", skill: { name: "Steal Pouch", chance: .25, effect: "steal" } },
    warlord:  { name: "Grimfang the Warlord", hp: 260, atk: 24, def: 11, spd: 8, xp: 300, gold: 250, art: "warlord", color: "#b03a3a", boss: true,
                skill: { name: "Warlord's Rage", chance: .35, mult: 2.0 }, enrageAt: .3 },
  };

  function makePlayer() {
    return {
      name: "Aldric",
      level: 1, xp: 0, nextXp: 20,
      hp: 60, maxHp: 60, mp: 12, maxMp: 12,
      baseAtk: 9, baseDef: 5, baseSpd: 7,
      gold: 50,
      inventory: [
        { id: "potion", n: 2 },
        { id: "bronzeSword", n: 1, equipped: "weapon" },
        { id: "leatherArmor", n: 1, equipped: "armor" },
      ],
      skills: ["fireball", "heal"],           // unlocked by level
      flags: {},                              // quest/story flags
      status: {},                             // battle-only statuses
    };
  }

  function stats(p) {
    let atk = p.baseAtk, def = p.baseDef, spd = p.baseSpd;
    for (const it of p.inventory) {
      if (!it.equipped) continue;
      const d = ITEMS[it.id];
      atk += d.atk || 0; def += d.def || 0; spd += d.spd || 0;
    }
    if (hasItem(p, "charm")) { const c = ITEMS.charm; spd += c.spd; }
    return { atk, def, spd };
  }
  function hasItem(p, id) { return p.inventory.some(i => i.id === id && i.n > 0); }
  function addItem(p, id, n = 1) {
    const ex = p.inventory.find(i => i.id === id);
    if (ex) ex.n += n; else p.inventory.push({ id, n });
  }
  function removeItem(p, id, n = 1) {
    const ex = p.inventory.find(i => i.id === id);
    if (!ex) return false;
    ex.n -= n;
    if (ex.n <= 0) {
      if (ex.equipped) ex.equipped = null;   // unequip when count hits zero? keep equipped flag on re-add
      p.inventory.splice(p.inventory.indexOf(ex), 1);
    }
    return true;
  }

  function gainXp(p, amount) {
    const msgs = [];
    p.xp += amount;
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.level++;
      p.nextXp = Math.floor(p.nextXp * 1.6 + 10);
      const hpUp = 14 + randInt(0, 6), mpUp = 4 + randInt(0, 3);
      p.maxHp += hpUp; p.maxMp += mpUp;
      p.hp = p.maxHp; p.mp = p.maxMp;
      p.baseAtk += 3; p.baseDef += 2; p.baseSpd += 1;
      msgs.push(`LEVEL ${p.level}!  HP+${hpUp} MP+${mpUp} ATK+3 DEF+2`);
      const unlock = { 3: "thunder", 5: "smash" }[p.level];
      if (unlock && !p.skills.includes(unlock)) { p.skills.push(unlock); msgs.push(`Learned ${SKILLS[unlock].name}!`); }
    }
    return msgs;
  }

  return { ITEMS, SKILLS, MONSTERS, makePlayer, stats, hasItem, addItem, removeItem, gainXp };
})();
