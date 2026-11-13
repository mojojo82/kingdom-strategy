const { chromium } = require("playwright"); const fs = require("fs"); const { execSync } = require("child_process");
(async () => {
  const b = await chromium.launch({ args: ["--allow-file-access-from-files"] }); const P = await b.newPage({ viewport: { width: 600, height: 300 } });
  await P.goto("file://" + __dirname + "/lab.html"); await P.waitForTimeout(800);
  const clips = [["1_flash", { flash: 1 }, false], ["2_splash", { splash: 1 }, false], ["3_embers", { embers: 1 }, false], ["4_smoke", { smoke: 1 }, false], ["5_lingering_flames", { linger: 1 }, false], ["6_ground_ring_big", { ring: 1 }, true],
    ["7_all_small_normal_throw", { flash: 1, splash: 1, embers: 1, smoke: 1 }, false], ["8_all_big_lance_charge", { flash: 1, splash: 1, embers: 1, smoke: 1, linger: 1, ring: 1 }, true]];
  for (const [name, opts, big] of clips) {
    const frames = await P.evaluate(([o, bg]) => run(o, bg), [opts, big]);
    const d = __dirname + "/f_" + name; fs.rmSync(d, { recursive: true, force: true }); fs.mkdirSync(d);
    frames.forEach((u, i) => fs.writeFileSync(d + "/" + String(i).padStart(4, "0") + ".jpg", Buffer.from(u.split(",")[1], "base64")));
    execSync(`ffmpeg -loglevel error -y -framerate 60 -i ${d}/%04d.jpg -vf "scale=1040:-2:flags=lanczos" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p ${__dirname}/fire_${name}.mp4`);
    console.log("made", name, frames.length);
  }
  console.log("errors?"); await b.close();
})();
