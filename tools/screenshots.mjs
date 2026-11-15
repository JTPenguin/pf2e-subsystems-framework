/*
 * Takes the docs screenshots in docs/images/ from a live Foundry, through headless Firefox and WebDriver BiDi.
 *
 *   ELECTRON_RUN_AS_NODE=1 ~/foundryvtt/foundryvtt tools/screenshots.mjs
 *
 * Needs: Foundry running with the `subsystem-docs` world loaded, nobody logged in as Gamemaster or Player, Firefox and ImageMagick.
 * The world holds a Party of PCs, one assigned to Player, and The Toll Captain and The Tide Causeway imported from Example Challenges.
 * Passwords, if the users have them, go in tools/screenshots.local.json as { "gm": "...", "player": "..." } (not in git).
 *
 * The script sets each challenge's state itself, so every run gives the same pictures. At the end it resets both challenges,
 * clears the panel and the chat log, and logs both users out.
 */

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "docs", "images");
const URL = "http://localhost:30000";
const WORLD = "subsystem-docs";
const VIEWPORT = { width: 1600, height: 1000 };
const secretsFile = path.join(root, "tools", "screenshots.local.json");
const secrets = fs.existsSync(secretsFile) ? JSON.parse(fs.readFileSync(secretsFile, "utf8")) : {};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------- */
/*  WebDriver BiDi                               */
/* -------------------------------------------- */

async function launchFirefox(profile) {
  const firefox = spawn("firefox", ["--headless", "--no-remote", "--profile", profile, "--remote-debugging-port", "9333", "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    firefox.stderr.on("data", (data) => {
      const match = String(data).match(/WebDriver BiDi listening on (ws:\S+)/);
      if (match) resolve(match[1]);
    });
    setTimeout(() => reject(new Error("Firefox didn't start WebDriver BiDi")), 20000);
  });
  const socket = new WebSocket(`${wsUrl.replace(/\/?$/, "")}/session`);
  await new Promise((resolve) => socket.addEventListener("open", resolve));
  let next = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    pending.get(message.id)?.(message);
    pending.delete(message.id);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++next;
    pending.set(id, (message) => (message.type === "error" ? reject(new Error(`${method}: ${message.error}: ${message.message}`)) : resolve(message.result)));
    socket.send(JSON.stringify({ id, method, params }));
  });
  await send("session.new", { capabilities: {} });
  return { send, close: async () => { await send("session.end").catch(() => {}); firefox.kill(); } };
}

/** A tab with its own cookies, so two users can be logged in at once. */
async function openTab(browser) {
  const { userContext } = await browser.send("browser.createUserContext");
  const { context } = await browser.send("browsingContext.create", { type: "tab", userContext });
  await browser.send("browsingContext.setViewport", { context, viewport: VIEWPORT, devicePixelRatio: 2 });
  /** Run a function in the page. Arguments and the result go through JSON. */
  const run = async (fn, ...args) => {
    const body = `async (json) => JSON.stringify(await (${fn})(...JSON.parse(json)) ?? null)`;
    const result = await browser.send("script.callFunction", { functionDeclaration: body, arguments: [{ type: "string", value: JSON.stringify(args) }], target: { context }, awaitPromise: true });
    if (result.type === "exception") throw new Error(result.exceptionDetails.text);
    return JSON.parse(result.result.value);
  };
  /** Take a raw PNG of a box in CSS pixels (2x on disk), or of the whole view, into the scratch folder. */
  const shoot = async (name, box) => {
    // A background tab stops drawing its canvas, so bring this one to the front first.
    await browser.send("browsingContext.activate", { context });
    await sleep(1000);
    const clip = box ? { clip: { type: "box", ...box } } : {};
    const { data } = await browser.send("browsingContext.captureScreenshot", { context, ...clip });
    const raw = path.join(scratch, `${name}.png`);
    fs.writeFileSync(raw, Buffer.from(data, "base64"));
    return raw;
  };
  return { context, run, shoot, go: (url) => browser.send("browsingContext.navigate", { context, url, wait: "complete" }) };
}

/* -------------------------------------------- */
/*  Files                                        */
/* -------------------------------------------- */

/** Compress a raw shot into docs/images/ as a 256-colour PNG. `scale` shrinks it first (the hero is a full screen). */
function save(raw, name, { scale = 1 } = {}) {
  const file = path.join(OUT, name);
  const resize = scale === 1 ? [] : ["-resize", `${scale * 100}%`];
  execFileSync("convert", [raw, ...resize, "-strip", "+dither", "-colors", "256", "-define", "png:compression-level=9", `PNG8:${file}`]);
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`${name}: ${kb} KB`);
  return file;
}

/* -------------------------------------------- */
/*  In the page                                  */
/* -------------------------------------------- */

async function logIn(tab, name, password = "") {
  await tab.go(`${URL}/join`);
  await sleep(1000);
  const ok = await tab.run((name, password) => {
    const select = document.querySelector('select[name="userId"]');
    const option = [...(select?.options ?? [])].find((candidate) => candidate.textContent.trim() === name);
    if (!option || option.disabled) return false;
    select.value = option.value;
    document.querySelector('input[name="password"]').value = password;
    document.querySelector('button[name="join"]').click();
    return true;
  }, name, password);
  if (!ok) throw new Error(`Can't log in as ${name}: no such user, or someone already holds the seat.`);
  for (let i = 0; i < 90; i++) {
    await sleep(1000);
    const ready = await tab.run(() => !!globalThis.game?.ready && !!globalThis.canvas?.ready).catch(() => false);
    if (ready) break;
  }
  // Let the canvas and the panel settle.
  await sleep(3000);
}

const logOut = (tab) => tab.run(() => { game.logOut(); }).catch(() => {});

/** The challenge page and the module's own functions, imported from the module so the page shares its write queue. */
const MODULE_HELPERS = `
  const base = "/modules/pf2e-subsystems-framework/scripts";
  const run = await import(base + "/challenge/run.js");
  const { writeChallenge } = await import(base + "/challenge/state.js");
  const panel = await import(base + "/panel/activation.js");
  const { challengePage } = await import(base + "/registry.js");
  const entryNamed = (name) => game.journal.getName(name) ?? (() => { throw new Error("No challenge named " + name); })();
`;

/** Run a function body in the GM's page with the module helpers in scope. */
const gm = (tab, body, ...args) => tab.run(new Function("...args", `return (async () => { ${MODULE_HELPERS} ${body} })();`), ...args);

/** The box around an element, in CSS pixels, with a margin, kept inside the viewport. */
const boxOf = (tab, selector, margin = 0) => tab.run((selector, margin, viewport) => {
  const elements = [...document.querySelectorAll(selector)].filter((element) => element.offsetParent || element.getClientRects().length);
  if (!elements.length) throw new Error(`Nothing matches ${selector}`);
  const rect = elements.at(-1).getBoundingClientRect();
  const x = Math.max(0, Math.floor(rect.left - margin));
  const y = Math.max(0, Math.floor(rect.top - margin));
  return { x, y, width: Math.min(viewport.width, Math.ceil(rect.right + margin)) - x, height: Math.min(viewport.height, Math.ceil(rect.bottom + margin)) - y };
}, selector, margin, VIEWPORT);

/* -------------------------------------------- */
/*  States                                       */
/* -------------------------------------------- */

/**
 * Put this user's panel at a spot and width (CSS pixels), through the module's own per-browser setting,
 * then make it just tall enough for what it shows, so the shot has no empty space.
 */
const placePanel = async (tab, spot) => {
  await tab.run(async (spot) => {
    const set = (height) => game.settings.set("pf2e-subsystems-framework", "panelSpot", { [game.userId]: { ...spot, height } });
    await set(900);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const panel = document.getElementById("ssm-panel");
    const body = panel?.querySelector(".ssm-panel-body");
    // The body stretches to fill the panel, so measure down to the bottom of its last child, plus the body's own bottom padding.
    const children = [...(body?.children ?? [])];
    if (!children.length) return;
    const bottom = Math.max(...children.map((child) => child.getBoundingClientRect().bottom));
    const padding = Number.parseFloat(getComputedStyle(body).paddingBottom) || 0;
    await set(Math.ceil(bottom - panel.getBoundingClientRect().top + padding) + 2);
  }, spot);
  await sleep(500);
};
// The GM's panel sits right of the challenge window; the player's in the middle.
const GM_SPOT = { left: 900, top: 60, width: 560 };
const PLAYER_SPOT = { left: 520, top: 60, width: 560 };

/** Put every challenge back to not started, take the panel down, and clear the chat log. */
const RESET = `
  if (game.world.id !== ${JSON.stringify(WORLD)}) throw new Error("This isn't the ${WORLD} world: " + game.world.id);
  for (const entry of game.journal) {
    const page = challengePage(entry);
    if (page && page.system.run.status !== "inactive") await writeChallenge(page, (system) => run.resetRun(system));
  }
  await game.settings.set("pf2e-subsystems-framework", "activeChallenge", {});
  await ChatMessage.deleteDocuments(game.messages.map((message) => message.id));
  for (const app of [...foundry.applications.instances.values()]) if (app.id?.startsWith("ssm-") && app.id !== "ssm-panel") await app.close();
  for (const entry of game.journal) if (entry.sheet?.rendered) await entry.sheet.close();
`;

/**
 * The Toll Captain in round 2: the captain and her Influence Points shown, two thresholds partly revealed, Diplomacy and Deception shown
 * but not Intimidation, two of the four modifiers shown, Kyra already acted.
 */
const TOLL_CAPTAIN = `
  const entry = entryNamed("The Toll Captain");
  const page = challengePage(entry);
  const pcs = game.actors.party.members;
  const kyra = pcs.find((actor) => actor.name === "Kyra");
  await writeChallenge(page, (system) => run.startRun(system));
  await writeChallenge(page, (system) => {
    run.advanceRound(system);
    const suspicion = system.counters[0];
    suspicion.revealed = true;
    suspicion.value = 1;
    const captain = system.subjects[0];
    captain.revealed = true;
    const influence = captain.counters[0];
    influence.revealed = true;
    influence.value = 3;
    influence.thresholds[0].reveal = "full";
    influence.thresholds[0].reached = true;
    influence.thresholds[1].reveal = "points";
    const show = { Discover: ["perception"], Influence: ["diplomacy", "deception"] };
    for (const action of captain.actions) for (const check of action.checks) check.revealed = (show[action.name] ?? []).includes(check.skill);
    for (const modifier of captain.modifiers) {
      const shown = ["Old Soldier", "No Bribes"].includes(modifier.name);
      modifier.revealed = shown;
      modifier.active = shown || modifier.name === "Threats";
    }
    if (kyra && !system.run.acted.includes(kyra.id)) system.run.acted.push(kyra.id);
  });
  await panel.takePanel(entry);
  return entry.id;
`;

/** The Tide Causeway in round 3: the Party track at 4 of 6 and one obstacle shown, the one the party is on. */
const TIDE_CAUSEWAY = `
  const entry = entryNamed("The Tide Causeway");
  const page = challengePage(entry);
  await writeChallenge(page, (system) => run.startRun(system));
  await writeChallenge(page, (system) => {
    run.advanceRound(system);
    run.advanceRound(system);
    const track = system.counters[0];
    track.revealed = true;
    track.value = 4;
    for (const subject of system.subjects) subject.revealed = subject.name === "Tidal Channel";
    const channel = system.subjects.find((subject) => subject.name === "Tidal Channel");
    channel.counters[0].revealed = true;
    channel.counters[0].value = 1;
    for (const action of channel.actions) for (const check of action.checks) check.revealed = true;
  });
  await panel.takePanel(entry);
  return entry.id;
`;

/* -------------------------------------------- */
/*  Shots                                        */
/* -------------------------------------------- */

fs.mkdirSync(OUT, { recursive: true });
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ssm-shots-"));
const profile = path.join(scratch, "firefox");
fs.mkdirSync(profile);
const browser = await launchFirefox(profile);
const gmTab = await openTab(browser);
const playerTab = await openTab(browser);
const loggedIn = [];

try {
  await logIn(gmTab, "Gamemaster", secrets.gm);
  loggedIn.push(gmTab);
  await gm(gmTab, RESET);
  await logIn(playerTab, "Player", secrets.player);
  loggedIn.push(playerTab);

  // The Toll Captain, with its window open beside the panel.
  const tollId = await gm(gmTab, TOLL_CAPTAIN);
  await gm(gmTab, `
    const entry = game.journal.get(args[0]);
    await entry.sheet.render({ force: true });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    entry.sheet.setPosition({ left: 110, top: 60, width: 760, height: 900 });
    ui.sidebar.collapse?.();
  `, tollId);
  await sleep(1500);
  await placePanel(gmTab, GM_SPOT);
  await placePanel(playerTab, PLAYER_SPOT);

  save(await gmTab.shoot("hero"), "hero.png", { scale: 0.5 });
  save(await gmTab.shoot("sheet", await boxOf(gmTab, ".ssm-sheet")), "challenge-window.png");

  const playerPanel = await playerTab.shoot("panel-player", await boxOf(playerTab, "#ssm-panel", 16));
  save(playerPanel, "panel-player.png");

  // What the eyes do: the captain's card on the sheet, where hidden entries have a crossed-out eye, beside what the player sees.
  // The GM's own panel shows only what players see too, plus the GM's buttons, so it wouldn't show the difference.
  await gm(gmTab, `
    const sheet = game.journal.get(args[0]).sheet;
    sheet.setPosition({ top: 0, height: 1000 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    sheet.element.querySelector(".ssm-subject-card")?.scrollIntoView({ block: "start" });
  `, tollId);
  await sleep(1000);
  const card = await gmTab.shoot("card", await boxOf(gmTab, ".ssm-sheet .ssm-subject-card", 8));
  const pair = path.join(scratch, "pair.png");
  execFileSync("convert", ["-background", "none", "-gravity", "north", card, "-size", "32x1", "xc:none", playerPanel, "+append", pair]);
  save(pair, "reveal-sheet-vs-panel.png");

  // A modifier's edit window: Old Soldier, a one-time −2 to Diplomacy DCs.
  await gm(gmTab, `
    const entry = game.journal.get(args[0]);
    const page = challengePage(entry);
    const captain = page.system.subjects[0];
    const modifier = captain.modifiers.find((candidate) => candidate.name === "Old Soldier");
    const { ModifierWindow } = await import(base + "/challenge/entry-window.js");
    const app = await ModifierWindow.open(page, captain.id, modifier.id);
    app.setPosition({ left: 900, top: 60 });
  `, tollId);
  await sleep(1500);
  save(await gmTab.shoot("edit", await boxOf(gmTab, ".ssm-modifier-window")), "edit-window.png");

  // Valeros rolls Diplomacy from the panel. Old Soldier takes 2 off the DC, so the chat card names it.
  await playerTab.run(() => {
    const button = [...document.querySelectorAll("#ssm-panel .ssm-panel-skill")].find((candidate) => candidate.textContent.trim().startsWith("Diplomacy"));
    if (!button) throw new Error("No Diplomacy check on the player's panel");
    // Shift skips PF2e's roll dialog.
    button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
  });
  await sleep(4000);
  // The card as the player sees it: it names the modifier but not the DC.
  await playerTab.run(() => {
    ui.sidebar.changeTab("chat", "primary");
    ui.sidebar.expand();
  });
  await playerTab.shoot("wake");
  await sleep(1500);
  save(await playerTab.shoot("chat", await boxOf(playerTab, "#chat .chat-message", 4)), "chat-card.png");

  // The Tide Causeway on the panel, as a player sees it.
  await gm(gmTab, RESET);
  await gm(gmTab, TIDE_CAUSEWAY);
  await sleep(1500);
  await placePanel(playerTab, PLAYER_SPOT);
  save(await playerTab.shoot("chase", await boxOf(playerTab, "#ssm-panel", 16)), "chase.png");

  await gm(gmTab, RESET);
} finally {
  for (const tab of loggedIn) await logOut(tab);
  await sleep(1500);
  await browser.close();
  fs.rmSync(scratch, { recursive: true, force: true });
}
