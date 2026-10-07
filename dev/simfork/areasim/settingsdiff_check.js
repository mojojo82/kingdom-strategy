const boot = require("./boot");
(async () => {
  const { b, P } = await boot("diff" + Date.now() + "@test.dev");
  const fresh = await P.evaluate(() => settingsDiffList());
  await P.evaluate(() => { localStorage.setItem("kingdom_prototype_spawninterval_v1", "2.5"); localStorage.setItem(OOZE_BLOB_KEY, "0"); localStorage.setItem("kingdom_prototype_heroBonus_v1", '{"atk":50}'); });
  const after = await P.evaluate(() => settingsDiffList());
  await P.evaluate(() => { document.documentElement.classList.remove("ks-noadmin"); document.getElementById("devSettingsDiffBtn").click(); });
  await P.waitForTimeout(300); await P.screenshot({ path: "../diff.png" });
  console.log("fresh:", JSON.stringify(fresh)); console.log("after:", after.join("\n"));
  await b.close();
})();
