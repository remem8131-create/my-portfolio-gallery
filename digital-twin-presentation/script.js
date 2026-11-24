/* ============================================================
   تجربة التوأم الرقمي — نظام الألعاب والنقاط والإنجازات
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const app = $("#app");
  const slides = $$(".slide");
  const mapBox = $("#stationMap");
  const achPanel = $("#achPanel");
  const achList = $("#achList");
  const toast = $("#toast");

  const arDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const toAr = (n) => String(n).replace(/\d/g, (d) => arDigits[Number(d)]);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- الحالة العامة ---------------- */
  const state = {
    station: 0,
    points: 0,
    completed: new Set(),
    achievements: new Set(),
    rewarded: new Set(),
    level: 1,
  };

  const LEVELS = [0, 100, 220, 360, 500];
  const levelOf = (p) => {
    let lvl = 1;
    LEVELS.forEach((t, i) => { if (p >= t) lvl = i + 1; });
    return lvl;
  };

  const ACHIEVEMENTS = [
    { id: "first", icon: "🔎", title: "أول اكتشاف", desc: "أجب عن سؤال التعريف في المحطة ٢." },
    { id: "engineer", icon: "⚙️", title: "مهندس النسخة", desc: "رتّب خطوات تصنيع التوأم بشكل صحيح." },
    { id: "patterns", icon: "📊", title: "بطل المختبر", desc: "أكمل تحديات مختبر المحطة الرابعة الخمسة." },
    { id: "explorer", icon: "🌍", title: "خبير الاستخدامات", desc: "وصّل مجالات التوأم بكل أوصافها." },
    { id: "eagle", icon: "🪶", title: "عين الصقر", desc: "اكشف العبارة الخاطئة في المحطة ٧." },
    { id: "swift", icon: "⚡", title: "سريع البديهة", desc: "أنجز تحدي السرعة قبل انتهاء الوقت." },
  ];

  /* ---------------- الخلفيات الفاتحة ---------------- */
  const palettes = [
    ["255,190,220", "205,180,255"],
    ["255,205,230", "215,195,255"],
    ["255,195,225", "200,185,255"],
    ["255,185,220", "215,190,255"],
    ["255,210,235", "205,195,255"],
    ["255,195,225", "225,200,255"],
    ["255,205,232", "200,180,250"],
    ["255,180,218", "210,185,255"],
    ["255,200,230", "220,195,255"],
  ];
  const gradients = palettes.map(([a, b], i) => {
    const x1 = 72 + ((i * 13) % 22), y1 = 10 + ((i * 17) % 22);
    const x2 = 12 + ((i * 11) % 24), y2 = 70 + ((i * 7) % 18);
    return [
      `radial-gradient(circle at ${x1}% ${y1}%, rgba(${a}, .62), transparent 46%)`,
      `radial-gradient(circle at ${x2}% ${y2}%, rgba(${b}, .55), transparent 48%)`,
      `radial-gradient(circle at 50% 110%, rgba(255,255,255,.75), transparent 60%)`,
      "linear-gradient(140deg, #fff7fc 0%, #f6efff 55%, #fffafc 100%)",
    ].join(",");
  });

  const bgLayers = [$("#bgA"), $("#bgB")];
  let activeLayer = 0, lastBg = 0;
  bgLayers[0].style.background = gradients[0];
  bgLayers[1].style.background = gradients[0];
  bgLayers[0].classList.add("show");
  function setBackground(i) {
    if (i === lastBg) return;
    const next = bgLayers[1 - activeLayer];
    next.style.background = gradients[i];
    next.classList.add("show");
    bgLayers[activeLayer].classList.remove("show");
    activeLayer = 1 - activeLayer;
    lastBg = i;
  }

  /* ---------------- واجهة التنقل: خريطة المحطات ---------------- */
  const mapNodes = slides.map((slide, i) => {
    const btn = document.createElement("button");
    btn.className = "map-node";
    btn.type = "button";
    btn.textContent = slide.dataset.icon || toAr(i + 1);
    btn.setAttribute("aria-label", `المحطة ${toAr(i + 1)}: ${slide.dataset.title || ""}`);
    btn.title = `المحطة ${toAr(i + 1)}: ${slide.dataset.title || ""}`;
    btn.addEventListener("click", () => showStation(i));
    mapBox.appendChild(btn);
    return btn;
  });

  function showStation(index) {
    if (index < 0 || index >= slides.length) return;
    state.station = index;
    slides.forEach((s, i) => s.classList.toggle("active", i === index));
    mapNodes.forEach((n, i) => {
      n.classList.toggle("active", i === index);
      n.classList.toggle("done", state.completed.has(i));
    });
    app.dataset.station = String(index);
    setBackground(index);
    if (index === 8) {
      rewardOnce("visitEnd", 10, 8, null);
      renderFinalBoard();
    }
  }

  /* ---------------- النقاط والمستويات والإنجازات ---------------- */
  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function renderAchievements() {
    achList.innerHTML = ACHIEVEMENTS.map((a) => {
      const unlocked = state.achievements.has(a.id);
      return `<div class="ach-item ${unlocked ? "unlocked" : ""}">
        <span class="ach-icon">${a.icon}</span>
        <div><strong>${a.title}</strong><small>${unlocked ? a.desc : "مقفل — " + a.desc}</small></div>
      </div>`;
    }).join("");
    $("#achValue").textContent = `${toAr(state.achievements.size)}/${toAr(ACHIEVEMENTS.length)}`;
  }

  function unlockAchievement(id) {
    if (state.achievements.has(id)) return;
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (!ach) return;
    state.achievements.add(id);
    renderAchievements();
    showToast(`${ach.icon} إنجاز جديد: ${ach.title}`);
  }

  function updateHUD() {
    $("#pointsValue").textContent = toAr(state.points);
    const newLevel = levelOf(state.points);
    if (newLevel > state.level) showToast(`🎉 وصلت إلى المستوى ${toAr(newLevel)}!`);
    state.level = newLevel;
    $("#levelValue").textContent = toAr(state.level);
    $("#topProgressBar").style.width = `${(state.completed.size / slides.length) * 100}%`;
    mapNodes.forEach((n, i) => n.classList.toggle("done", state.completed.has(i)));
    renderAchievements();
    if (state.station === 8) renderFinalBoard();
  }

  function addPoints(n) {
    state.points += n;
    updateHUD();
  }

  function rewardOnce(key, points, stationIndex, achievementId) {
    if (state.rewarded.has(key)) return;
    state.rewarded.add(key);
    if (!state.completed.has(stationIndex)) state.completed.add(stationIndex);
    addPoints(points);
    if (achievementId) unlockAchievement(achievementId);
    mapNodes[stationIndex].classList.add("done");
  }

  function setFeedback(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.classList.remove("good", "bad", "pop", "shake");
    void el.offsetWidth;
    if (kind) el.classList.add(kind);
    el.classList.add("pop");
  }

  /* ---------------- المحطة ٢: اختبار التعريف ---------------- */
  (function initQuiz2() {
    const root = $(".slide-quiz");
    const feedback = $("#quiz2Feedback");
    $$(".option", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.rewarded.has("quiz2")) return;
        $$(".option", root).forEach((o) => o.classList.remove("correct", "wrong", "shake"));
        const ok = btn.dataset.correct === "true";
        btn.classList.add(ok ? "correct" : "wrong");
        if (ok) {
          setFeedback(feedback, "أحسنت! التوأم الرقمي نسخة حيّة تتحدث بياناتها لحظة بلحظة. +٥٠ نقطة", "good");
          rewardOnce("quiz2", 50, 1, "first");
        } else {
          btn.classList.add("shake");
          setFeedback(feedback, "ليست أدق إجابة... تذكّر أن النسخة تتغيّر مع الوقت. حاول مرة أخرى.", "bad");
        }
      });
    });
  })();

  /* ---------------- المحطة ٣: لغز الترتيب ---------------- */
  (function initPuzzle3() {
    const root = $(".slide-puzzle");
    const tiles = $$(".puzzle-tile", root);
    const slots = $$(".slot small", root);
    const feedback = $("#puzzleFeedback");
    let chosen = [];

    function reset() {
      chosen = [];
      tiles.forEach((t) => t.classList.remove("used"));
      slots.forEach((s) => s.textContent = "؟");
      $$(".slot", root).forEach((s) => s.classList.remove("filled"));
    }

    tiles.forEach((tile) => {
      tile.addEventListener("click", () => {
        if (tile.classList.contains("used") || state.rewarded.has("puzzle3")) return;
        const order = Number(tile.dataset.order);
        if (order === chosen.length + 1) {
          chosen.push(order);
          tile.classList.add("used");
          const slotBox = $$(".slot", root)[chosen.length - 1];
          slotBox.classList.add("filled");
          slots[chosen.length - 1].textContent = $("strong", tile).textContent;
          if (chosen.length === 3) {
            setFeedback(feedback, "ترتيب مثالي! بيانات → نموذج → اتصال مستمر. +٨٠ نقطة", "good");
            rewardOnce("puzzle3", 80, 2, "engineer");
          } else {
            setFeedback(feedback, "خطوة صحيحة! ما الخطوة التي تأتي بعدها؟", "good");
          }
        } else {
          tile.classList.add("shake");
          setFeedback(feedback, "ليس هذا ترتيبها... ابدأ بالخطوة التي تجمع الأساس.", "bad");
          window.setTimeout(() => { tile.classList.remove("shake"); reset(); }, 650);
        }
      });
    });
  })();

  /* ---------------- المحطة ٤: محاكاة التوأم الرقمي ---------------- */
  (function initSimulation4() {
    const root = $(".slide-sim");
    const games = { quiz: false, speed: false, logic: false, error: false, sim: false };
    const progress = $("#labProgress");
    const bar = $("#labProgressBar");
    let timer = null, startedAt = 0, hits = 0, speedLocked = true;
    const feedbackFor = (key) => $(`.lab-card[data-game="${key}"] .lab-feedback`, root);
    const finish = (key, points, message) => {
      if (games[key]) return;
      games[key] = true;
      const done = Object.values(games).filter(Boolean).length;
      progress.textContent = `${toAr(done)} / ٥`;
      bar.style.width = `${done * 20}%`;
      addPoints(points);
      const fb = feedbackFor(key);
      if (fb) setFeedback(fb, `${message} +${toAr(points)} نقطة.`, "good");
      if (done === 5) {
        rewardOnce("lab4", 30, 3, "patterns");
        showToast("🏅 أكملت مختبر التحديات! +٣٠ نقطة إضافية");
      }
    };
    const lockOptions = (selector) => $$(selector, root).forEach((button) => { button.disabled = true; });

    $$("[data-answer]", root).forEach((button) => button.addEventListener("click", () => {
      if (games.quiz) return;
      const correct = button.dataset.answer === "b";
      button.classList.add(correct ? "is-correct" : "is-wrong");
      lockOptions("[data-answer]");
      if (correct) finish("quiz", 20, "صحيح! التوأم مرتبط بأصل حقيقي وبياناته.");
      else { setFeedback(feedbackFor("quiz"), "ليست هذه الإجابة؛ التوأم يحتاج أصلًا حقيقيًا وبيانات تتحدّث.", "bad"); games.quiz = true; updateLabProgress(); }
    }));

    function updateLabProgress() {
      const done = Object.values(games).filter(Boolean).length;
      progress.textContent = `${toAr(done)} / ٥`;
      bar.style.width = `${done * 20}%`;
      if (done === 5) { rewardOnce("lab4", 30, 3, "patterns"); showToast("🏅 أكملت مختبر التحديات! +٣٠ نقطة إضافية"); }
    }
    function stopSpeed() {
      window.clearInterval(timer); timer = null; speedLocked = true;
      $$("[data-signal]", root).forEach((b) => { b.disabled = true; });
      if (hits >= 4) finish("speed", 30, "سرعة مذهلة! التقطت الإشارات الحيّة.");
      else setFeedback(feedbackFor("speed"), `انتهى الوقت عند ${toAr(hits)} من ٤. ابدأ جولة جديدة وحاول مجددًا.`, "bad");
    }
    $("#labSpeedStart").addEventListener("click", () => {
      if (games.speed) return;
      window.clearInterval(timer); hits = 0; speedLocked = false; startedAt = Date.now();
      $$("[data-signal]", root).forEach((b) => { b.disabled = false; b.classList.remove("is-correct", "is-wrong"); });
      setFeedback(feedbackFor("speed"), "انطلق! اختر الإشارات المتصلة الآن.", "pop");
      timer = window.setInterval(() => {
        const remaining = Math.max(0, 12 - (Date.now() - startedAt) / 1000);
        $("#labTimer").textContent = toAr(Math.ceil(remaining));
        $("#labTimerBar").style.width = `${remaining / 12 * 100}%`;
        if (!remaining) stopSpeed();
      }, 100);
    });
    $$("[data-signal]", root).forEach((button) => button.addEventListener("click", () => {
      if (speedLocked || games.speed) return;
      if (button.dataset.signal === "static") {
        button.classList.add("is-wrong"); setFeedback(feedbackFor("speed"), "هذه بيانات أرشيفية وليست إشارة حيّة.", "bad"); return;
      }
      button.disabled = true; button.classList.add("is-correct"); hits++;
      setFeedback(feedbackFor("speed"), `إشارة حيّة! ${toAr(hits)} من ٤.`, "good");
      if (hits >= 4) stopSpeed();
    }));

    $$("[data-logic]", root).forEach((button) => button.addEventListener("click", () => {
      if (games.logic) return;
      lockOptions("[data-logic]");
      if (button.dataset.logic === "warn") { button.classList.add("is-correct"); finish("logic", 20, "استنتاج سليم: يجب تأمين الباب قبل الحركة."); }
      else { button.classList.add("is-wrong"); games.logic = true; setFeedback(feedbackFor("logic"), "إشارة الباب المفتوح تمنع الحركة الآمنة؛ أرسل تنبيهًا أولًا.", "bad"); updateLabProgress(); }
    }));
    $$("[data-error]", root).forEach((button) => button.addEventListener("click", () => {
      if (games.error) return;
      lockOptions("[data-error]");
      if (button.dataset.error === "bad") { button.classList.add("is-correct"); finish("error", 20, "أحسنت الرصد! لا يمكن للنموذج أن يتحدّث بلا بيانات."); }
      else { button.classList.add("is-wrong"); games.error = true; setFeedback(feedbackFor("error"), "هذه عبارة صحيحة. التوأم يحتاج بيانات واتصالًا ليعكس الأصل.", "bad"); updateLabProgress(); }
    }));

    const moisture = $("#moistureRange"), moistureOut = $("#moistureOut"), garden = $("#gardenScene"), gardenStatus = $("#gardenStatus");
    function updateGarden() {
      const value = Number(moisture.value);
      moistureOut.textContent = `${toAr(value)}٪`;
      garden.classList.toggle("garden-thirsty", value < 35);
      garden.classList.toggle("garden-happy", value >= 60);
      gardenStatus.textContent = value < 35 ? "التربة عطشى · اسقِها" : value < 60 ? "الرطوبة تتحسّن" : "رطوبة مثالية · النبات سعيد";
      setFeedback($("#gardenFeedback"), value < 35 ? "التوأم يتوقع ذبول النبتة ويقترح تشغيل الري." : value < 60 ? "التوأم يراقب التغيّر؛ اقتربت الرطوبة من النطاق الصحي." : "توقّع التوأم: النبات في حالة مثالية.", "pop");
    }
    moisture.addEventListener("input", updateGarden);
    $("#gardenApply").addEventListener("click", () => {
      if (games.sim) return;
      if (Number(moisture.value) < 60) { setFeedback($("#gardenFeedback"), "ارفع الرطوبة إلى ٦٠٪ على الأقل، ثم طبّق التغيير.", "bad"); return; }
      finish("sim", 20, "عادت الحديقة إلى التوازن! التوأم توقّع أثر التغيير.");
    });
  })();
  (function initMatching5() {
    const root = $(".slide-match");
    const feedback = $("#matchFeedback");
    const fields = $$(".match-field", root);
    const descs = $$(".match-desc", root);
    let selected = null;
    let matched = 0;

    const clearSelection = () => {
      fields.forEach((f) => f.classList.remove("selected"));
      descs.forEach((d) => d.classList.remove("selected"));
      selected = null;
    };

    fields.forEach((field) => {
      field.addEventListener("click", () => {
        if (field.classList.contains("matched")) return;
        fields.forEach((f) => f.classList.remove("selected"));
        descs.forEach((d) => d.classList.remove("selected"));
        field.classList.add("selected");
        selected = field;
        setFeedback(feedback, "اختر الآن الوصف المناسب لهذا المجال.");
      });
    });

    descs.forEach((desc) => {
      desc.addEventListener("click", () => {
        if (desc.classList.contains("matched")) return;
        if (!selected) {
          setFeedback(feedback, "اختر مجالًا أولًا من القائمة اليمنى.", "bad");
          return;
        }
        if (selected.dataset.match === desc.dataset.match) {
          selected.classList.remove("selected");
          selected.classList.add("matched");
          desc.classList.add("matched");
          selected.disabled = desc.disabled = true;
          matched += 1;
          addPoints(10);
          selected = null;
          setFeedback(feedback, `وصلة صحيحة! الأزواج المكتملة: ${toAr(matched)} / ٥`, "good");
          if (matched === 5) {
            setFeedback(feedback, "أحسنت! كل المجالات موصلة (+٥٠ نقطة إضافية).", "good");
            rewardOnce("match5", 50, 4, "explorer");
          }
        } else {
          selected.classList.add("shake");
          desc.classList.add("shake");
          setFeedback(feedback, "ليس هذا الوصف... جرّب وصفًا آخر.", "bad");
          const f = selected, d = desc;
          window.setTimeout(() => { f.classList.remove("shake", "selected"); d.classList.remove("shake"); selected = null; }, 550);
        }
      });
    });
  })();

  /* ---------------- المحطة ٦: اختبار الشخصية ---------------- */
  (function initPersona6() {
    const root = $(".slide-persona");
    const reveal = $("#personaReveal");
    $$(".persona-opt", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".persona-opt", root).forEach((b) => b.classList.remove("correct", "wrong", "shake"));
        const ok = btn.dataset.correct === "true";
        btn.classList.add(ok ? "correct" : "wrong");
        if (ok) {
          reveal.textContent = "إلى حدّ ما نعم: تستطيع النسخة تقليد أسلوب كلامك واختياراتك المتوقعة، لأنها تدرّبت على أنماطك السابقة. لكنها لا تعيش المشاعر التي تقف خلفها.";
          reveal.classList.add("pop");
          setFeedback($("#personaReveal"), reveal.textContent, "good");
          rewardOnce("persona6", 50, 5, null);
        } else {
          btn.classList.add("shake");
          reveal.textContent = "ليس بعد: التوائم الرقمية نماذج احتمالات، لا كائنات واعية. قد تتحدث بصوتك، لكنها لا تشعر بالفرح أو القلق كما تش أنت. جرّب إجابة أخرى.";
          setFeedback(reveal, reveal.textContent, "bad");
        }
      });
    });
  })();

  /* ---------------- المحطة ٧: اكتشاف الخطأ ---------------- */
  (function initSpot7() {
    const root = $(".slide-spot");
    const feedback = $("#spotFeedback");
    const meterFill = $("#meterFill");
    const meterLabel = $("#meterLabel");
    $$(".spot-item", root).forEach((item) => {
      item.addEventListener("click", () => {
        if (state.rewarded.has("spot7")) return;
        if (item.dataset.wrong === "true") {
          item.classList.add("found");
          item.disabled = true;
          meterFill.style.width = "100%";
          meterLabel.textContent = "دقة الملاحظة: ١٠٠٪ — اكتشفت الخطأ!";
          setFeedback(feedback, "ممتاز! التوائم الرقمية تحتاج بيانات، ولا تقرأ الأفكار مباشرة. +٧٠ نقطة", "good");
          rewardOnce("spot7", 70, 6, "eagle");
        } else {
          item.classList.add("shake", "miss");
          meterFill.style.width = "35%";
          meterLabel.textContent = "دقة الملاحظة: ٣٥٪ — ابحث أكثر.";
          setFeedback(feedback, "هذه عبارة صحيحة... انظر جيدًا إلى القائمة.", "bad");
          window.setTimeout(() => item.classList.remove("shake", "miss"), 500);
        }
      });
    });
  })();

  /* ---------------- المحطة ٨: تحدي السرعة ---------------- */
  (function initSpeed8() {
    const root = $(".slide-speed");
    const cards = $$(".speed-card", root);
    const bar = $("#speedBar");
    const timeText = $("#speedTime");
    const feedback = $("#speedFeedback");
    const startBtn = $("#speedStart");
    const correctOrder = [2026, 2030, 2035];
    let running = false, timeLeft = 20, timer = null, chosen = [];

    function resetRound() {
      window.clearInterval(timer);
      running = false;
      timeLeft = 20;
      chosen = [];
      bar.style.width = "100%";
      timeText.textContent = "٢٠ ث";
      cards.forEach((c) => c.classList.remove("picked", "wrongpick"));
      startBtn.disabled = false;
      startBtn.textContent = "ابدأ المؤقت ⏱️";
    }

    function stop() {
      window.clearInterval(timer);
      running = false;
      startBtn.disabled = false;
      startBtn.textContent = "جرّب مرة أخرى ⏱️";
    }

    startBtn.addEventListener("click", () => {
      resetRound();
      running = true;
      startBtn.disabled = true;
      startBtn.textContent = "الوقت جارٍ...";
      setFeedback(feedback, "انطلق! اختر ٢٠٢٦ ثم ٢٠٣٠ ثم ٢٠٣٥+.", "good");
      timer = window.setInterval(() => {
        timeLeft -= 1;
        bar.style.width = `${(timeLeft / 20) * 100}%`;
        timeText.textContent = `${toAr(timeLeft)} ث`;
        if (timeLeft <= 0) {
          stop();
          setFeedback(feedback, "انتهى الوقت! اضغط «جرّب مرة أخرى».", "bad");
        }
      }, 1000);
    });

    cards.forEach((card) => {
      card.addEventListener("click", () => {
        if (!running) {
          setFeedback(feedback, "ابدأ المؤقت أولًا ثم رتّب السنوات.", "bad");
          return;
        }
        const year = Number(card.dataset.year);
        if (year === correctOrder[chosen.length]) {
          card.classList.add("picked");
          chosen.push(year);
          if (chosen.length === 3) {
            stop();
            const gained = 60 + timeLeft * 2;
            setFeedback(feedback, `رائع! رتّبت المستقبل في ${toAr(20 - timeLeft)} ثانية. +${toAr(gained)} نقطة`, "good");
            rewardOnce("speed8", gained, 7, "swift");
          } else {
            setFeedback(feedback, "صحيح! التالي...", "good");
          }
        } else {
          card.classList.add("wrongpick");
          stop();
          setFeedback(feedback, "ترتيب غير صحيح... تذكّر أن الأقرب هو ٢٠٢٦.", "bad");
        }
      });
    });
  })();

  /* ---------------- المحطة ٩: الخاتمة والنتائج ---------------- */
  function renderFinalBoard() {
    $("#finalPoints").textContent = toAr(state.points);
    $("#finalLevel").textContent = toAr(state.level);
    $("#finalStations").textContent = `${toAr(state.completed.size)} / ${toAr(slides.length)}`;
    $("#finalAch").textContent = `${toAr(state.achievements.size)} / ${toAr(ACHIEVEMENTS.length)}`;
  }

  $$(".final-chips button").forEach((chip) => {
    chip.addEventListener("click", () => {
      $$(".final-chips button").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const reveal = $("#finalReveal");
      reveal.textContent = chip.dataset.final || "";
      reveal.classList.remove("pop");
      void reveal.offsetWidth;
      reveal.classList.add("pop");
    });
  });

  $("#replayBtn").addEventListener("click", () => window.location.reload());

  $("#shareBtn").addEventListener("click", async () => {
    const btn = $("#shareBtn");
    const original = btn.textContent;
    const text = `جمع ${state.points} نقطة في تجربة التوأم الرقمي!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, text: text, url: location.href });
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        btn.textContent = "تم نسخ النتيجة ✓";
      } else {
        btn.textContent = text;
      }
    } catch (err) {
      if (!err || err.name !== "AbortError") btn.textContent = "تعذّرت المشاركة";
      return;
    }
    window.setTimeout(() => { btn.textContent = original; }, 2200);
  });

  /* ---------------- لوحة الإنجازات ---------------- */
  $("#achBtn").addEventListener("click", () => {
    achPanel.hidden = false;
    renderAchievements();
  });
  $("#achClose").addEventListener("click", () => { achPanel.hidden = true; });
  achPanel.addEventListener("click", (e) => { if (e.target === achPanel) achPanel.hidden = true; });

  /* ----------------_START: روابط الانتقال المباشر + لوحة المفاتيح ---------------- */
  $$("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = Number(btn.dataset.go);
      if (target === 1) rewardOnce("startChallenge", 10, 0, null);
      showStation(target);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { achPanel.hidden = true; return; }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-9]$/.test(e.key)) showStation(Number(e.key) - 1);
  });
  /* ----------------_END: روابط الانتقال المباشر + لوحة المفاتيح ---------------- */

  /* ---------------- جزيئات فاتحة ---------------- */
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  let width = 0, height = 0, particles = [];

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth || window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = width < 600 ? 34 : 60;
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.2,
      vy: -(Math.random() * 0.25 + 0.06),
      color: Math.random() > 0.5 ? "240,140,195" : "165,125,235",
      alpha: Math.random() * 0.3 + 0.12,
    }));
    if (reduceMotion) drawParticles();
  }

  function drawParticles() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      if (!reduceMotion) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
      ctx.fill();
    });
    if (!reduceMotion) window.requestAnimationFrame(drawParticles);
  }

  window.addEventListener("resize", resizeCanvas, { passive: true });
  resizeCanvas();
  if (!reduceMotion) window.requestAnimationFrame(drawParticles);

  /* ---------------- بدء التجربة ---------------- */
  renderAchievements();
  showStation(0);
  updateHUD();
})();
