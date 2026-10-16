/* v1222 one-off (Harley, 17 Oct, "use the server account for Tom"): set ONE player's Research Points.
   Run only by .github/workflows/oneoff.yml (needs the deploy service account). Finds the player by sign-in email, backs the save up to
   save/backup_<time>, sets researchPoints, logs to adminlog. Reads nothing else. Prints only uid, before, after.
   Usage: node tools/oneoff-set-rp.js <env: test|live> <email> <value> */
const { initializeApp } = require("../functions/node_modules/firebase-admin/app");
const { getFirestore } = require("../functions/node_modules/firebase-admin/firestore");
const { getAuth } = require("../functions/node_modules/firebase-admin/auth");
(async () => {
  const [env, email, valueS] = process.argv.slice(2), value = Math.trunc(+valueS);
  if (!/^(test|live)$/.test(env) || !email || !(value >= 0)) throw new Error("usage: <test|live> <email> <value>");
  initializeApp({ projectId: "kingdom-strategy" });
  const user = await getAuth().getUserByEmail(email), uid = user.uid, R = env === "test" ? "envs/test/" : "";
  const db = getFirestore(), ref = db.doc(R + "players/" + uid + "/save/main"), cur = await ref.get();
  if (!cur.exists) throw new Error("no save for that player");
  const before = (cur.data() || {}).researchPoints, now = Date.now();
  await db.doc(R + "players/" + uid + "/save/backup_" + now).set({ save: cur.data(), at: now, by: "oneoff-ci", why: "set RP" });
  await ref.set({ researchPoints: value }, { merge: true });
  await db.collection(R + "adminlog").add({ by: "oneoff-ci", setRp: { uid, from: before == null ? null : before, to: value, backup: "backup_" + now }, at: now });
  const after = ((await ref.get()).data() || {}).researchPoints;
  console.log("RESULT uid=" + uid + " before=" + Math.floor(before || 0) + " after=" + after + " backup=backup_" + now);
})().catch((e) => { console.error("FAILED " + e.message); process.exit(1); });
