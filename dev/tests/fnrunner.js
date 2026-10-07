// Runs the REAL functions/index.js in node against the shared test store (stands in for Firebase's servers in headless tests).
const Module = require("module"), path = require("path");
module.exports = function makeRunner(store) {
  class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
  const clone = (v) => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  function docRef(p) { return { path: p, id: p.split("/").pop() }; }
  function snap(p) { const d = store[p]; return { exists: d != null, data: () => clone(d) }; }
  const db = {
    doc: docRef,
    getAll: async (...refs) => refs.map((r) => snap(r.path)), /* v920 */
    collection: (c) => ({ orderBy: (f, dir) => ({ limit: (n) => ({ get: async () => ({ docs: Object.keys(store).filter((k) => k.indexOf(c + "/") === 0 && k.slice(c.length + 1).indexOf("/") < 0).map((k) => ({ id: k.split("/").pop(), data: () => clone(store[k]) })).sort((x, y) => ((y.data() || {})[f] || 0) - ((x.data() || {})[f] || 0)).slice(0, n) }) }) }), where: (f, op, v) => ({ get: async () => ({ docs: Object.keys(store).filter((k) => k.indexOf(c + "/") === 0 && k.slice(c.length + 1).indexOf("/") < 0).map((k) => ({ id: k.split("/").pop(), data: () => clone(store[k]) })).filter((d) => { const x = (d.data() || {})[f]; return op === ">=" ? x >= v : op === "==" ? x === v : true; }) }) }), doc: (id) => { const p = c + "/" + (id || ("auto" + Math.random().toString(36).slice(2, 10))); return Object.assign(docRef(p), { set: async (d) => { store[p] = clone(d); } }); }, add: async (d) => { store[c + "/auto" + Math.random().toString(36).slice(2, 10)] = clone(d); } }),
    runTransaction: async (fn) => {
      const writes = [];
      const tx = { get: async (r) => snap(r.path), set: (r, d, o) => writes.push(["set", r, d, o]), update: (r, d) => writes.push(["update", r, d]), delete: (r) => writes.push(["delete", r]) };
      const out = await fn(tx);
      for (const [op, r, d, o] of writes) {
        if (op === "set") store[r.path] = o && o.merge ? Object.assign({}, store[r.path] || {}, clone(d)) : clone(d);
        else if (op === "update") { if (!store[r.path]) throw new HttpsError("not-found", "no doc"); store[r.path] = Object.assign({}, store[r.path], clone(d)); }
        else delete store[r.path];
      }
      return out;
    }
  };
  // give docRef a .set for adminSetWallet
  const origDoc = db.doc; db.doc = (p) => Object.assign(origDoc(p), { get: async () => snap(p), set: async (d, o) => { store[p] = o && o.merge ? Object.assign({}, store[p] || {}, clone(d)) : clone(d); } });
  const fakes = {
    "firebase-functions/v2/https": { onCall: (h) => h, HttpsError },
    "firebase-functions/v2": { setGlobalOptions: () => {} },
    "firebase-functions/v2/firestore": { onDocumentWritten: (pattern, h) => h }, /* v920: save triggers are plain handlers here (see call.trigger) */
    "firebase-admin/app": { initializeApp: () => {} },
    "firebase-admin/firestore": { getFirestore: () => db }
  };
  const orig = Module._load;
  Module._load = function (req, parent, isMain) { return fakes[req] || orig.apply(this, arguments); };
  const repoFile = path.join(__dirname, "../../functions/index.js"); /* repo layout; the original session had tests/ next to kingdom-strategy/ */
  const file = require("fs").existsSync(repoFile) ? repoFile : path.join(__dirname, "../kingdom-strategy/functions/index.js");
  delete require.cache[require.resolve(file)];
  const fns = require(file);
  Module._load = orig;
  const call = async function call(name, dataJson, authJson) {
    try { const r = await fns[name]({ data: JSON.parse(dataJson), auth: JSON.parse(authJson) }); return JSON.stringify({ data: r }); }
    catch (e) { return JSON.stringify({ error: { code: e.code || "internal", message: e.message, details: e.details || (e.extra) } }); }
  };
  /* v920: run a save trigger: before/after = save objects (or null), tB/tA = their write times (ms) */
  call.trigger = async function (name, uid, before, after, tB, tA) {
    const mk = (d, t, p) => ({ exists: d != null, data: () => clone(d), updateTime: { toMillis: () => t }, ref: { set: async (x) => { store[p] = clone(x); } } });
    const p = "players/" + uid + "/save/main";
    return fns[name]({ params: { uid }, data: { before: mk(before, tB, p), after: mk(after, tA, p) } });
  };
  return call;
};
