// Fake Firebase compat SDK for headless tests. Store is node-side (window.__fbstore) so several pages share it.
// Enforces the Firestore rules that matter: path parity, no nested arrays, no undefined, update() needs an existing doc.
(function () {
  if (window.firebase) return;
  function segs(p) { return p.split("/").filter(Boolean); }
  function err(code, msg) { var e = new Error(msg); e.code = code; return e; }
  function checkVal(v, inArr) {
    if (v === undefined) throw err("invalid-argument", "Unsupported field value: undefined");
    if (Array.isArray(v)) { if (inArr) throw err("invalid-argument", "Nested arrays are not supported"); v.forEach(function (x) { checkVal(x, true); }); return; }
    if (v && typeof v === "object") { for (var k in v) checkVal(v[k], false); }
  }
  var subs = [];
  /* v1625: optional usage counters for the cost calculator (dev/costsim). Billing-like: get = 1 read per doc returned; a listener = 1 read per doc on
     the first delivery, then 1 read per doc that CHANGED; set / update / delete = 1 write. Paths are grouped with ids replaced by * */
  var ST = window.__fbStats = { reads: 0, writes: 0, calls: 0, byPath: {}, byFn: {}, listeners: {} };
  function pat(p) { return segs(p).map(function (x, i) { return i % 2 ? "*" : x; }).join("/").replace(/^envs\/\*\//, "").replace(/^servers\/\*\//, ""); }
  function bump(kind, p, n) { if (!(n > 0)) return; ST[kind] += n; var k = pat(p), o = ST.byPath[k] || (ST.byPath[k] = { reads: 0, writes: 0 }); o[kind] += n; }
  async function all() { return JSON.parse(await window.__fbstore("dump")); }
  async function notify() { var st = await all(); subs.forEach(function (s) { try { s(st); } catch (e) { console.error(e); } }); }
  window.__fbNotify = notify;
  function parent(p) { return segs(p).slice(0, -1).join("/"); }
  function snapDoc(path, d) { return { id: segs(path).pop(), exists: d != null, metadata: { hasPendingWrites: false }, data: function () { return d == null ? undefined : JSON.parse(JSON.stringify(d)); } }; }
  function FieldPath(k) { this.k = k; }
  function DocRef(path) {
    if (segs(path).length % 2 !== 0) throw err("invalid-argument", "Invalid document reference. Document references must have an even number of segments, but " + path + " has " + segs(path).length);
    this.path = segs(path).join("/"); this.id = segs(path).pop();
  }
  DocRef.prototype.get = async function () { var st = await all(); bump("reads", this.path, 1); return snapDoc(this.path, st[this.path]); };
  DocRef.prototype.set = async function (d, opt) { checkVal(d); bump("writes", this.path, 1); var st = await all(); var v = (opt && opt.merge) ? Object.assign({}, st[this.path] || {}, d) : d; var js = JSON.stringify(v); if (js.length > 1048000) throw err("invalid-argument", "Document exceeds the maximum allowed size of 1,048,576 bytes."); await window.__fbstore("set", this.path, js); notify(); };
  DocRef.prototype.update = async function () {
    var a = [].slice.call(arguments), st = await all(), cur = st[this.path]; bump("writes", this.path, 1);
    if (!cur) throw err("not-found", "No document to update: " + this.path);
    var patch = {};
    if (a[0] instanceof FieldPath) { for (var i = 0; i < a.length; i += 2) patch[a[i].k] = a[i + 1]; }
    else { patch = a[0]; for (var k in patch) if (k.indexOf(".") !== -1) throw new Error("test: dotted key used without FieldPath: " + k); }
    checkVal(patch); await window.__fbstore("set", this.path, JSON.stringify(Object.assign({}, cur, patch))); notify();
  };
  DocRef.prototype.delete = async function () { bump("writes", this.path, 1); await window.__fbstore("del", this.path); notify(); };
  DocRef.prototype.onSnapshot = function (next, error) { var self = this, last, f = function (st) { var js = JSON.stringify(st[self.path] === undefined ? null : st[self.path]); if (js !== last) { bump("reads", self.path, 1); last = js; } next(snapDoc(self.path, st[self.path])); };
    ST.listeners[pat(self.path)] = (ST.listeners[pat(self.path)] || 0) + 1; subs.push(f); all().then(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; };
  function Query(path, filters, order, lim) {
    if (segs(path).length % 2 !== 1) throw err("invalid-argument", "Invalid collection reference. Collection references must have an odd number of segments, but " + path + " has " + segs(path).length);
    this.path = segs(path).join("/"); this.f = filters || []; this.o = order || null; this.l = lim || 0;
  }
  Query.prototype.where = function (f, op, v) { return new Query(this.path, this.f.concat([[f, op, v]]), this.o, this.l); };
  Query.prototype.orderBy = function (f, d) { return new Query(this.path, this.f, [f, d || "asc"], this.l); };
  Query.prototype.limit = function (n) { return new Query(this.path, this.f, this.o, n); };
  Query.prototype.run = function (st) {
    var self = this, docs = Object.keys(st).filter(function (k) { return parent(k) === self.path; }).map(function (k) { return { k: k, d: st[k] }; });
    this.f.forEach(function (f) { docs = docs.filter(function (x) { var v = x.d[f[0]]; return f[1] === "array-contains" ? (Array.isArray(v) && v.indexOf(f[2]) !== -1) : f[1] === "array-contains-any" ? (Array.isArray(v) && v.some(function (x) { return f[2].indexOf(x) !== -1; })) : f[1] === "==" ? v === f[2] : f[1] === ">=" ? v >= f[2] : f[1] === "<=" ? v <= f[2] : f[1] === ">" ? v > f[2] : f[1] === "<" ? v < f[2] : true; }); });
    if (this.o) { var o = this.o; docs = docs.filter(function (x) { return x.d[o[0]] !== undefined; }); docs.sort(function (a, b) { var x = a.d[o[0]], y = b.d[o[0]]; return (x < y ? -1 : x > y ? 1 : 0) * (o[1] === "desc" ? -1 : 1); }); }
    if (this.l) docs = docs.slice(0, this.l);
    return { docs: docs.map(function (x) { return snapDoc(x.k, x.d); }) };
  };
  Query.prototype.get = async function () { var r = this.run(await all()); bump("reads", this.path + "/x", Math.max(1, r.docs.length)); return r; };
  Query.prototype.onSnapshot = function (next, error) { var self = this, seen = null, f = function (st) { var r = self.run(st), cur = {}, n = 0; r.docs.forEach(function (d) { var js = JSON.stringify(d.data()); cur[d.id] = js; if (!seen || seen[d.id] !== js) n++; }); if (!seen) n = Math.max(1, n); seen = cur; bump("reads", self.path + "/x", n); next(r); };
    ST.listeners[pat(self.path + "/x")] = (ST.listeners[pat(self.path + "/x")] || 0) + 1; subs.push(f); all().then(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; };
  var fsObj = {
    useEmulator: function () {},
    settings: function (s) { window.__fbSettings = s; },
    doc: function (p) { return new DocRef(p); },
    collection: function (p) { return new Query(p); },
    runTransaction: async function (fn) {
      var writes = [];
      var tx = { get: function (r) { return r.get(); }, set: function (r, d, o) { writes.push([r, d, o]); } };
      var out = await fn(tx);
      for (var i = 0; i < writes.length; i++) await writes[i][0].set(writes[i][1], writes[i][2]);
      return out;
    }
  };
  var firestoreFn = function () { return fsObj; }; firestoreFn.FieldPath = FieldPath;
  var authUser = null, authCbs = [];
  try { authUser = JSON.parse(localStorage.getItem("__fakeAuth") || "null"); } catch (e) {}
  function setUser(u) { authUser = u; try { localStorage.setItem("__fakeAuth", JSON.stringify(u)); } catch (e) {} setTimeout(function () { authCbs.forEach(function (c) { c(authUser); }); }, 10); return Promise.resolve({ user: u }); }
  function uidFor(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return "u" + (h >>> 0).toString(36) + "xx"; }
  var authObj = {
    useEmulator: function () {},
    onAuthStateChanged: function (cb) { authCbs.push(cb); setTimeout(function () { cb(authUser); }, 0); return function () { authCbs = authCbs.filter(function (x) { return x !== cb; }); }; },
    signInAnonymously: function () { return setUser({ uid: "anon" + Math.random().toString(36).slice(2, 8), isAnonymous: true }); },
    signInWithEmailAndPassword: function (e, p) { if (!e) return Promise.reject(err("auth/invalid-email", "bad")); return setUser({ uid: uidFor(e), email: e, isAnonymous: false }); },
    createUserWithEmailAndPassword: function (e, p) { if ((p || "").length < 6) return Promise.reject(err("auth/weak-password", "weak")); return setUser({ uid: uidFor(e), email: e, isAnonymous: false }); },
    signInWithPopup: function () { return setUser({ uid: uidFor("google:" + (window.__fakeGoogle || "gina@x.dev")), email: window.__fakeGoogle || "gina@x.dev", displayName: "Gina Google", isAnonymous: false }); },
    sendPasswordResetEmail: function () { return Promise.resolve(); },
    signOut: function () { authUser = null; try { localStorage.removeItem("__fakeAuth"); } catch (e) {} return Promise.resolve(); }
  };
  function functionsObj() { return { useEmulator: function () {}, httpsCallable: function (name) { return function (data) { ST.calls++; ST.byFn[name] = (ST.byFn[name] || 0) + 1;
    return window.__fbcall(name, JSON.stringify(data || {}), JSON.stringify(authUser ? { uid: authUser.uid, token: { firebase: { sign_in_provider: authUser.isAnonymous ? "anonymous" : "password" } } } : null)).then(function (r) {
      r = JSON.parse(r); if (r.error) { var e = new Error(r.error.message); e.code = r.error.code; e.details = r.error.details; throw e; } return { data: r.data }; }); }; } }; }
  var apps = [];
  var authFn = function () { return authObj; }; authFn.GoogleAuthProvider = function () {};
  window.firebase = { apps: apps, initializeApp: function (c) { window.__fbConfig = c; apps.push(c); return c; }, app: function () { return { functions: functionsObj }; }, firestore: firestoreFn, auth: authFn };
})();
