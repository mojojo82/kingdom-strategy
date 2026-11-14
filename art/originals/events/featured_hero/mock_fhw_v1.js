/* Featured Hero Week mockup overlay - injected into the TEST game headless. window.__EVM = { tab: "points"|"check" } */
(function () {
  var A = "../art/originals/events/featured_hero/", I = "../art/items/", M = window.__EVM || {};
  var old = document.getElementById("evMock"); if (old) old.remove();
  var css = `
  #evMock { position:fixed; inset:0; z-index:2147483000; display:flex; flex-direction:column; background:#0b1322; color:#f3e9d2; font-family:var(--bodyfont,system-ui); }
  #evMock .ev-top { position:relative; flex:none; display:flex; align-items:center; gap:10px; padding:calc(env(safe-area-inset-top,0px) + 10px) 12px 8px; background:linear-gradient(180deg,#1a2a44,#0f1a2e); border-bottom:2px solid #c9a24a; }
  #evMock .ev-top .ev-ttl { position:absolute; left:0; right:0; bottom:8px; pointer-events:none; flex:1; margin:0; padding:0; border:0; width:auto; background:none; text-align:center !important; font-family:'KS Title','Lilita One',sans-serif; font-weight:400; font-size:24px; letter-spacing:1px; color:#f6e2a6; -webkit-text-stroke:1.6px #3a2a10; paint-order:stroke fill; }
  #evMock .ev-x { width:34px; height:34px; border-radius:50%; border:2px solid #e9c46a; background:radial-gradient(circle at 40% 35%,#7a2f1c,#3d140b); color:#fbe7b2; font-size:17px; font-weight:900; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 0 rgba(0,0,0,.5); }
  #evMock .ev-sp { width:34px; }
  #evMock .ev-tabs { flex:none; display:flex; gap:8px; padding:8px 10px; overflow-x:auto; background:#0f1a2e; border-bottom:1px dashed rgba(201,162,74,.5); scrollbar-width:none; }
  #evMock .ev-tab { flex:0 0 66px; text-align:center; font-size:10.5px; font-weight:700; color:#a9b4c8; }
  #evMock .ev-tab .ic { position:relative; width:58px; height:58px; margin:0 auto 3px; border-radius:12px; border:2px solid rgba(255,255,255,.35); background:linear-gradient(#20324f,#2d4a72); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 0 rgba(0,0,0,.45); }
  #evMock .ev-tab .ic img { width:86%; height:86%; object-fit:contain; }
  #evMock .ev-tab.on { color:#f6e2a6; } #evMock .ev-tab.on .ic { border-color:#ffe28a; box-shadow:0 0 0 2px rgba(240,201,95,.8), 0 2px 0 rgba(0,0,0,.45); background:linear-gradient(#2a5aa0,#4a8fd8); }
  #evMock .ev-tab .dot { position:absolute; right:-3px; top:-3px; width:13px; height:13px; border-radius:50%; background:#e23b2e; border:2px solid #fff; }
  #evMock .ev-body { flex:1; overflow-y:auto; scrollbar-width:none; }
  #evMock .ev-ban { position:relative; height:300px; background:url(${A}fhw_banner_v1_gpt.png) 58% 40%/cover; overflow:hidden; }
  #evMock .ev-ban::after { content:""; position:absolute; left:0; right:0; bottom:0; height:90px; background:linear-gradient(180deg,rgba(11,19,34,0),#0b1322); pointer-events:none; }
  #evMock .ev-hero { position:absolute; right:-18px; bottom:-34px; height:330px; filter:drop-shadow(0 6px 10px rgba(0,0,0,.55)); -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 22%); mask-image:linear-gradient(90deg,transparent 0,#000 22%); }
  #evMock .ev-tt { position:absolute; left:12px; top:14px; width:56%; z-index:2; }
  #evMock .ev-tt .k { display:inline-block; font-size:11px; font-weight:800; letter-spacing:1px; color:#1a1206; background:linear-gradient(#f0c95f,#c98f1e); padding:3px 9px; border-radius:20px; }
  #evMock .ev-tt h1 { margin:6px 0 2px; font-family:'KS Title','Lilita One',sans-serif; font-weight:400; font-size:30px; line-height:1.02; color:#fff; -webkit-text-stroke:2.2px #2a1c08; paint-order:stroke fill; text-shadow:0 3px 0 rgba(0,0,0,.4); }
  #evMock .ev-tt .hn { font-family:'KS Title','Lilita One',sans-serif; font-size:19px; color:#ffd77a; -webkit-text-stroke:1.6px #2a1c08; paint-order:stroke fill; }
  #evMock .ev-tt .rar { display:inline-block; margin-top:5px; font-size:11px; font-weight:800; color:#fff; background:#c0661c; border:1px solid #ffc56b; border-radius:6px; padding:2px 7px; }
  #evMock .ev-tt .tm { margin-top:10px; display:inline-flex; align-items:center; gap:5px; font-size:12px; font-weight:700; background:rgba(5,10,20,.72); border:1px solid rgba(240,201,95,.6); border-radius:16px; padding:4px 10px; }
  #evMock .ev-tt .info { margin-top:8px; display:block; width:max-content; font-size:12px; font-weight:800; color:#06131c; background:#2bb3d9; border-radius:8px; padding:6px 12px; }
  #evMock .ev-pts { position:relative; margin:-46px 10px 0; z-index:3; background:linear-gradient(180deg,#5a3d1e,#3a2610); border:2px solid #b18a50; border-radius:12px; padding:10px 10px 26px; box-shadow:0 4px 0 rgba(0,0,0,.4); }
  #evMock .ev-pts .row1 { display:flex; align-items:center; gap:8px; }
  #evMock .ev-pts .row1 img { width:34px; height:34px; }
  #evMock .ev-pts .row1 b { font-family:'KS Title','Lilita One',sans-serif; font-weight:400; font-size:22px; color:#ffe6a0; -webkit-text-stroke:1.4px #2a1c08; paint-order:stroke fill; }
  #evMock .ev-pts .row1 span { font-size:12px; color:#e8d3a6; }
  #evMock .ev-trk { position:relative; margin:30px 14px 4px 10px; height:12px; border-radius:8px; background:#1a120a; border:1px solid #7a5a2c; }
  #evMock .ev-trk i { position:absolute; left:0; top:0; bottom:0; border-radius:8px; background:linear-gradient(90deg,#c98f1e,#f6d36b); }
  #evMock .ev-ms { position:absolute; top:-17px; transform:translateX(-50%); text-align:center; }
  #evMock .ev-ms .rw { position:relative; width:44px; height:44px; border-radius:9px; border:2px solid rgba(255,255,255,.6); background:linear-gradient(#f0861c,#ffc56b); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 0 rgba(0,0,0,.45); }
  #evMock .ev-ms .rw.r3 { background:linear-gradient(#6a52d6,#b3a3f5); } #evMock .ev-ms .rw.r2 { background:linear-gradient(#2a73c9,#6cc0f5); }
  #evMock .ev-ms .rw img { width:92%; height:92%; object-fit:contain; border-radius:6px; }
  #evMock .ev-ms .rw img.face { object-position:50% 12%; object-fit:cover; width:100%; height:100%; }
  #evMock .ev-ms .rw b { position:absolute; right:2px; bottom:-1px; font-family:'KS Title','Lilita One',sans-serif; font-weight:400; font-size:14px; color:#fff; -webkit-text-stroke:2px #3a2f28; paint-order:stroke fill; }
  #evMock .ev-ms .rw .pz { position:absolute; left:-4px; top:-5px; width:20px; height:20px; }
  #evMock .ev-ms .got { position:absolute; inset:0; border-radius:8px; background:rgba(0,0,0,.45); display:flex; align-items:center; justify-content:center; color:#7fe08a; font-size:22px; font-weight:900; }
  #evMock .ev-ms .rw.ready { box-shadow:0 0 0 3px #ffe28a, 0 0 14px #ffd04d; }
  #evMock .ev-ms small { display:block; margin-top:4px; font-size:11px; font-weight:800; color:#e8d3a6; }
  #evMock .ev-sub { display:flex; gap:8px; margin:12px 10px 6px; }
  #evMock .ev-sub span { flex:1; text-align:center; padding:8px 4px; border-radius:9px; font-weight:800; font-size:13px; color:#a9b4c8; border:1px dotted #5d6f93; }
  #evMock .ev-sub span.on { color:#f0c95f; border:1px dashed #c9a24a; background:#161f2e; }
  #evMock .ev-list { padding:0 10px 14px; display:flex; flex-direction:column; gap:8px; }
  #evMock .ev-t { display:flex; align-items:center; gap:10px; background:linear-gradient(180deg,#4a3218,#33220f); border:1.5px solid #8a6a3a; border-radius:10px; padding:8px 10px; }
  #evMock .ev-t .ti { flex:none; width:40px; height:40px; border-radius:8px; background:rgba(0,0,0,.3); display:flex; align-items:center; justify-content:center; }
  #evMock .ev-t .ti img { width:90%; height:90%; object-fit:contain; }
  #evMock .ev-t .tx { flex:1; min-width:0; font-size:12.5px; line-height:1.3; }
  #evMock .ev-t .tx b { display:block; color:#f6e7c4; font-size:13px; }
  #evMock .ev-t .tx em { font-style:normal; color:#ffd77a; font-weight:800; }
  #evMock .ev-t .bar { margin-top:4px; height:7px; border-radius:5px; background:#1a120a; overflow:hidden; } #evMock .ev-t .bar i { display:block; height:100%; background:#2bb3d9; }
  #evMock .ev-t .go { flex:none; min-width:58px; text-align:center; font-weight:800; font-size:13px; color:#06131c; background:#2bb3d9; border-radius:8px; padding:8px 10px; }
  #evMock .ev-t .go.done { background:#33291c; color:#7fe08a; border:1px solid #6b5730; }
  #evMock .ev-t .go.claim { background:linear-gradient(#f0c95f,#c98f1e); color:#2a1806; }
  #evMock .ev-note { margin:2px 12px 16px; font-size:11.5px; color:#93a2ba; text-align:center; }
  `;
  var st = document.createElement("style"); st.id = "evMockCss"; st.textContent = css; document.head.appendChild(st);
  var tabs = [["Featured Hero", A + "icon_fhw.png", 1, 1], ["Event Shop", A + "icon_shop.png", 0, 0], ["Daily Missions", A + "icon_daily.png", 0, 1], ["Arena", A + "icon_arena.png", 0, 0], ["Sign-in", A + "icon_signin.png", 0, 0]];
  var ms = [[100, "face", 10, "r4", 1], [300, "chest_weapon_select", 1, "r3", 1], [600, "face", 10, "r4", 0], [1000, "speed_general", 5, "r2", 0], [1600, "face", 10, "r4", 0]], pts = 640, top = 1600;
  var face = A + "caelum_portrait_keyed_mock.png";
  var fill = (function () { var prev = 0; for (var i = 0; i < ms.length; i++) { if (pts < ms[i][0]) return (i + (pts - prev) / (ms[i][0] - prev)) / ms.length * 100; prev = ms[i][0]; } return 100; })();
  var msHtml = ms.map(function (m, i) { var x = (i + 1) / ms.length * 100 - 4, ready = pts >= m[0] && !m[4];
    return '<div class="ev-ms" style="left:' + x + '%"><div class="rw ' + m[3] + (ready ? " ready" : "") + '">' + (m[1] === "face" ? '<img class="face" src="' + face + '"><img class="pz" src="' + I + 'fragment.webp">' : '<img src="' + I + m[1] + '.webp">') + "<b>" + m[2] + "</b>" + (m[4] ? '<div class="got">✓</div>' : "") + "</div><small>" + m[0].toLocaleString("en-US") + "</small></div>"; }).join("");
  var tasks = M.tab === "check" ? [
      ["fragment", "Clear 1 new Conquest level", "Once this week", "+150", 1, 1, "done"],
      ["chest_hero_select", "Beat your next chapter boss", "Once this week", "+300", 0, 1, "go"],
      ["ticket", "Use 20 weapon draw tickets", "12 / 20", "+150", 12, 20, "go"],
      ["speed_construction", "Upgrade any building", "Once this week", "+100", 1, 1, "claim"],
      ["stamina", "Defeat 3 monsters on the World map", "1 / 3", "+150", 1, 3, "go"]]
    : [
      ["speed_training", "Defeat enemies in Conquest", "Every 100 enemies (farming counts)", "+5", 3, 5, "go"],
      ["ARENA", "Win Arena fights", "Each win", "+20", 0, 1, "go"],
      ["march_speed", "Win against camps on the World map", "Each win", "+15", 0, 1, "go"],
      ["ticket", "Use weapon draw tickets", "Each ticket", "+3", 0, 1, "go"],
      ["gems", "Spend gems", "Every 100 gems", "+10", 0, 1, "go"]];
  var tHtml = tasks.map(function (t) { var art = t[0];
    return '<div class="ev-t"><div class="ti"><img src="' + (art === "ARENA" ? A + "icon_arena.png" : I + art + ".webp") + '"></div><div class="tx"><b>' + t[1] + '</b>' + t[2] + ' · <em>' + t[3] + ' pts</em>' + (M.tab === "check" && t[5] > 1 ? '<div class="bar"><i style="width:' + Math.round(t[4] / t[5] * 100) + '%"></i></div>' : "") + '</div><div class="go' + (t[6] === "done" ? " done" : t[6] === "claim" ? " claim" : "") + '">' + (t[6] === "done" ? "✓ Done" : t[6] === "claim" ? "Claim" : "Go") + "</div></div>"; }).join("");
  var el = document.createElement("div"); el.id = "evMock";
  el.innerHTML = '<div class="ev-top"><div class="ev-ttl">EVENTS</div><div class="ev-sp" style="flex:1"></div><div class="ev-x">✕</div></div>'
    + '<div class="ev-tabs">' + tabs.map(function (t) { return '<div class="ev-tab' + (t[2] ? " on" : "") + '"><div class="ic"><img src="' + t[1] + '" onerror="this.style.visibility=\'hidden\'">' + (t[3] ? '<span class="dot"></span>' : "") + "</div>" + t[0] + "</div>"; }).join("") + "</div>"
    + '<div class="ev-body"><div class="ev-ban"><img class="ev-hero" src="' + face + '"><div class="ev-tt"><span class="k">WEEKLY EVENT</span><h1>Featured<br>Hero Week</h1><div class="hn">Caelum Vex</div><span class="rar">LEGENDARY</span><br><span class="tm">⏳ Ends in 4d 11h</span><span class="info">Hero details</span></div></div>'
    + '<div class="ev-pts"><div class="row1"><img src="' + A + 'icon_medal.png" onerror="this.style.visibility=\'hidden\'"><b>' + pts.toLocaleString("en-US") + '</b><span>Hero Medals this week</span></div><div class="ev-trk"><i style="width:' + fill + '%"></i>' + msHtml + "</div></div>"
    + '<div class="ev-sub"><span' + (M.tab !== "check" ? ' class="on"' : "") + '>Earn Medals</span><span' + (M.tab === "check" ? ' class="on"' : "") + '>Weekly Checklist</span></div>'
    + '<div class="ev-list">' + tHtml + "</div>"
    + '<div class="ev-note">Medals reset every Monday. Caelum Vex shards go straight to your hero.</div></div>';
  document.body.appendChild(el);
})();
