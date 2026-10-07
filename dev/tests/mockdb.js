// In-browser mock of the artifact db capability, shared between pages through a node-side store (exposed function).
window.__mockDb = (function () {
  function parent(p) { return p.split("/").slice(0, -1).join("/"); }
  var subs = [];
  function snapDoc(path, data) { return { id: path.split("/").pop(), exists: data != null, data: function () { return data == null ? undefined : JSON.parse(JSON.stringify(data)); } }; }
  async function all() { return JSON.parse(await window.__store("dump")); }
  async function notify() { var st = await all(); subs.forEach(function (s) { s.fire(st); }); }
  window.__mockNotify = notify;
  function query(path, filters, order, lim) {
    function run(st) {
      var docs = Object.keys(st).filter(function (k) { return parent(k) === path; }).map(function (k) { return { k: k, d: st[k] }; });
      filters.forEach(function (f) { docs = docs.filter(function (x) { var v = x.d[f[0]]; return f[1] === "==" ? v === f[2] : f[1] === ">=" ? v >= f[2] : f[1] === "<=" ? v <= f[2] : f[1] === ">" ? v > f[2] : f[1] === "<" ? v < f[2] : true; }); });
      if (order) docs.sort(function (a, b) { var x = a.d[order[0]], y = b.d[order[0]]; return (x < y ? -1 : x > y ? 1 : 0) * (order[1] === "desc" ? -1 : 1); });
      if (lim) docs = docs.slice(0, lim);
      return { docs: docs.map(function (x) { return snapDoc(x.k, x.d); }), size: docs.length, empty: !docs.length };
    }
    var q = {
      where: function (f, op, v) { return query(path, filters.concat([[f, op, v]]), order, lim); },
      orderBy: function (f, d) { return query(path, filters, [f, d || "asc"], lim); },
      limit: function (n) { return query(path, filters, order, n); },
      get: async function () { return run(await all()); },
      onSnapshot: function (cb) { var s = { fire: function (st) { try { cb(run(st)); } catch (e) { console.error(e); } } }; subs.push(s); all().then(s.fire); return function () { subs = subs.filter(function (x) { return x !== s; }); }; },
      doc: function (id) { return doc(path + "/" + id); }
    };
    return q;
  }
  function doc(path) {
    return {
      id: path.split("/").pop(), path: path,
      get: async function () { var st = await all(); return snapDoc(path, st[path]); },
      set: async function (data) { await window.__store("set", path, JSON.stringify(data)); notify(); },
      update: async function (data) { var st = await all(); if (!st[path]) throw new Error("not_found"); await window.__store("set", path, JSON.stringify(Object.assign({}, st[path], data))); notify(); },
      delete: async function () { await window.__store("del", path); notify(); },
      acquire: async function (o) { var st = await all(); await window.__store("set", path, JSON.stringify(Object.assign({}, st[path] || {}, (o && o.data) || {}))); notify(); return { acquired: true }; },
      onSnapshot: function (cb) { var s = { fire: function (st) { cb(snapDoc(path, st[path])); } }; subs.push(s); all().then(s.fire); return function () { subs = subs.filter(function (x) { return x !== s; }); }; },
      collection: function (c) { return query(path + "/" + c, [], null, 0); }
    };
  }
  return { doc: doc, collection: function (p) { return query(p, [], null, 0); } };
})();
window.claude = { use: function (n) { return Promise.resolve(n === "db" ? window.__mockDb : null); } };
