// Runs the REAL functions/index.js in node against the shared test store (stands in for Firebase's servers in headless tests).
const Module = require("module"), path = require("path");
module.exports = function makeRunner(store) {
  class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details; } }
  const clone = (v) => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  function docRef(p) { return { path: p, id: p.split("/").pop() }; }
  function snap(p) { const d = store[p]; return { exists: d != null, data: () => clone(d) }; }
  const db = {
    doc: docRef,
    collection: (c) => ({ doc: (id) => { const p = c + "/" + (id || ("auto" + Math.random().toString(36).slice(2, 10))); return Object.assign(docRef(p), { set: async (d) => { store[p] = clone(d); } }); }, add: async (d) => { store[c + "/auto" + Math.random().toString(36).slice(2, 10)] = clone(d); } }),
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
  const origDoc = db.doc; db.doc = (p) => Object.assign(origDoc(p), { set: async (d, o) => { store[p] = o && o.merge ? Object.assign({}, store[p] || {}, clone(d)) : clone(d); } });
  const fakes = {
    "firebase-functions/v2/https": { onCall: (h) => h, HttpsError },
    "firebase-functions/v2": { setGlobalOptions: () => {} },
    "firebase-admin/app": { initializeApp: () => {} },
    "firebase-admin/firestore": { getFirestore: () => db }
  };
  const orig = Module._load;
  Module._load = function (req, parent, isMain) { return fakes[req] || orig.apply(this, arguments); };
  const file = path.join(__dirname, "../kingdom-strategy/functions/index.js");
  delete require.cache[require.resolve(file)];
  const fns = require(file);
  Module._load = orig;
  return async function call(name, dataJson, authJson) {
    try { const r = await fns[name]({ data: JSON.parse(dataJson), auth: JSON.parse(authJson) }); return JSON.stringify({ data: r }); }
    catch (e) { return JSON.stringify({ error: { code: e.code || "internal", message: e.message, details: e.details || (e.extra) } }); }
  };
};
