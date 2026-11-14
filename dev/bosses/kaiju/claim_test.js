const C = require("/home/claude/kingdom-strategy/functions/core.js");
const store = {}, call = require("/home/claude/kingdom-strategy/dev/tests/fnrunner.js")(store);
(async () => {
  const w = C.arenaKeys(Date.now()).w - 1, base = "envs/test/bosslb/w" + w + "/p/";
  store[base + "u1"] = { dmg: 50000, name: "A", fh: "kessa" }; store[base + "u2"] = { dmg: 30000, name: "B" }; store[base + "u3"] = { dmg: 1000, name: "C" };
  for (const u of ["u1", "u2", "u3"]) console.log(u, await call("claimBossRank", JSON.stringify({ env: "test", key: w }), JSON.stringify({ uid: u, token: {} })));
  console.log("again", await call("claimBossRank", JSON.stringify({ env: "test", key: w }), JSON.stringify({ uid: "u1", token: {} })));
  console.log("mail", JSON.stringify(Object.keys(store).filter((k) => /mail/.test(k)).map((k) => [k.split("/").slice(-3).join("/"), store[k].items])));
})();
