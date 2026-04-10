// ─── Storage Helpers ────────────────────────────────────────────────────────
const STORAGE_KEYS = { prs: "workout_prs", workouts: "workout_templates", history: "workout_history" };
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ─── Inject keyframes (#15 fix) ─────────────────────────────────────────────
(function(){
  const s = document.createElement("style");
  s.textContent = "@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}} *{-webkit-tap-highlight-color:transparent;box-sizing:border-box} input,button,select{font-family:inherit} html,body{margin:0;padding:0;background:#0A0A0F;overflow-x:hidden;-webkit-overflow-scrolling:touch} #root{min-height:100vh;overflow-y:auto}";
  document.head.appendChild(s);
})();

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20, stroke = 2, fill = "none" }) =>
  React.createElement('svg', {
    width: size, height: size, viewBox: "0 0 24 24",
    fill, stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round"
  }, React.createElement('path', { d }));

const icons = {
  play:     "M5 3l14 9-14 9V3z",
  pause:    "M6 4h4v16H6zM14 4h4v16h-4z",
  stop:     "M4 4h16v16H4z",
  add:      "M12 5v14M5 12h14",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  trophy:   "M6 2h12l2 7a6 6 0 01-6 6H10a6 6 0 01-6-6L6 2zM10 15v4m-3 3h10M9 15h6",
  timer:    "M12 6v6l4 2M12 2a10 10 0 100 20A10 10 0 0012 2z",
  next:     "M5 12h14M13 6l6 6-6 6",
  check:    "M20 6L9 17l-5-5",
  back:     "M19 12H5M12 5l-7 7 7 7",
  close:    "M18 6L6 18M6 6l12 12",
  dumbbell: "M6.5 6.5h11M6.5 17.5h11M3 9.5h3m12 0h3M3 14.5h3m12 0h3M6 6.5v11M18 6.5v11",
  edit:     "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  copy:     "M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2zM5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1",
  history:  "M12 8v4l3 3M3 12a9 9 0 1018 0 9 9 0 00-18 0z",
  repeat:   "M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3",
  up:       "M18 15l-6-6-6 6",
  down:     "M6 9l6 6 6-6",
};

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

const BLOCK_LABELS    = { work:"TREINO", rest:"DESCANSO", warmup:"AQUEC.", cooldown:"COOL DOWN" };
const BLOCK_COLOR_MAP = { work:"#FF6B35", rest:"#00C9A7", warmup:"#F7B731", cooldown:"#4361EE" };

const { useState, useEffect, useRef, useCallback } = React;

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
function App() {
  const [screen, setScreen]           = useState("home");
  const [prevScreen, setPrevScreen]   = useState("home");
  const [prs, setPrs]                 = useState(() => load(STORAGE_KEYS.prs));
  const [workouts, setWorkouts]       = useState(() => load(STORAGE_KEYS.workouts));
  const [hist, setHist]               = useState(() => load(STORAGE_KEYS.history)); // v4
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [cheatsheet, setCheatsheet]   = useState(null);
  const [editIdx, setEditIdx]         = useState(null); // v1: index of workout being edited

  const savePrs = (d) => { setPrs(d); save(STORAGE_KEYS.prs, d); };
  const saveWorkouts = (d) => { setWorkouts(d); save(STORAGE_KEYS.workouts, d); };
  const saveHist = (d) => { setHist(d); save(STORAGE_KEYS.history, d); }; // v4
  const startWorkout = (w) => { setActiveWorkout(w); goTo("timer"); };

  // v4: log completed session
  const logSession = (workout, elapsed) => {
    const entry = {
      name: workout ? workout.name : "Livre",
      date: new Date().toISOString(),
      duration: elapsed,
      blocks: workout ? workout.blocks.length : 0,
    };
    const updated = [entry, ...hist];
    saveHist(updated);
  };

  const goTo = (s) => {
    setPrevScreen(screen);
    setScreen(s);
  };

  // v1: open builder in edit mode
  const editWorkout = (idx) => {
    setEditIdx(idx);
    goTo("builder");
  };

  // v2: duplicate a workout
  const duplicateWorkout = (idx) => {
    const w = workouts[idx];
    const copy = { ...w, name: w.name + " (cópia)", blocks: w.blocks.map(b => ({ ...b })) };
    saveWorkouts([...workouts, copy]);
  };

  // v12: reorder workouts
  const moveWorkout = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= workouts.length) return;
    const arr = [...workouts];
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    saveWorkouts(arr);
  };

  if (screen === "home")    return React.createElement(HomeScreen,    { goTo, workouts, prs, startWorkout, saveWorkouts, cheatsheet, setCheatsheet, editWorkout, duplicateWorkout, hist, moveWorkout });
  if (screen === "timer")   return React.createElement(TimerScreen,   { workout: activeWorkout, goTo, savePr: (pr) => savePrs([pr, ...prs]), cheatsheet, logSession });
  if (screen === "cheat")   return React.createElement(CheatsheetScreen, { goTo, cheatsheet, setCheatsheet, prevScreen });
  if (screen === "pr")      return React.createElement(PRScreen,      { prs, savePrs, goTo });
  if (screen === "builder") return React.createElement(BuilderScreen, { workouts, saveWorkouts, goTo, editIdx, setEditIdx });
  if (screen === "scan")    return React.createElement(ScanScreen,    { goTo, saveWorkouts, workouts, startWorkout });
  if (screen === "quick")   return React.createElement(QuickTextScreen, { goTo, saveWorkouts, workouts, startWorkout });
  if (screen === "history") return React.createElement(HistoryScreen, { goTo, hist, saveHist }); // v4
}

// ═══════════════════════════════════════════════════════════════════════════
//  HOME
// ═══════════════════════════════════════════════════════════════════════════
function HomeScreen({ goTo, workouts, prs, startWorkout, saveWorkouts, cheatsheet, setCheatsheet, editWorkout, duplicateWorkout, hist, moveWorkout }) {
  const latestPr = prs[0];
  return (
    React.createElement('div', { style: S.screen },
      React.createElement('div', { style: S.homeHeader },
        React.createElement('div', null,
          React.createElement('div', { style: S.greeting }, "Bom treino 💪"),
          React.createElement('div', { style: S.homeTitle }, "WORKOUT\nHUB")
        ),
        React.createElement('div', { style: { display:"flex", gap:8 } },
          React.createElement('div', { style: S.prBadge, onClick: () => goTo("history") },
            React.createElement(Icon, { d: icons.history, size: 20, stroke: 1.5 }),
            React.createElement('span', { style: { color:"#fff", fontSize:12, fontWeight:700 } }, hist.length)
          ),
          React.createElement('div', { style: S.prBadge, onClick: () => goTo("pr") },
            React.createElement(Icon, { d: icons.trophy, size: 22, stroke: 1.5 }),
            React.createElement('span', { style: S.prCount }, prs.length)
          )
        )
      ),
      React.createElement('div', { style: S.quickActions },
        React.createElement('button', { style: { ...S.quickBtn, background:"#FF6B35" }, onClick: () => startWorkout(null) },
          React.createElement(Icon, { d: icons.timer, size: 28, stroke: 1.5 }),
          React.createElement('span', null, "Cronômetro Livre")
        ),
        React.createElement('button', { style: { ...S.quickBtn, background:"#4361EE" }, onClick: () => goTo("builder") },
          React.createElement(Icon, { d: icons.add, size: 28, stroke: 2 }),
          React.createElement('span', null, "Novo Treino")
        )
      ),
      React.createElement('button', {
        style: S.scanCta,
        onClick: () => goTo("scan")
      },
        React.createElement('span', { style:{ fontSize:22 } }, "📸"),
        React.createElement('div', { style:{ flex:1 } },
          React.createElement('div', { style:{ color:"#fff", fontSize:14, fontWeight:700 } }, "Escanear Treino"),
          React.createElement('div', { style:{ color:"#A29BFE", fontSize:12, marginTop:2 } }, "Foto → blocos automáticos com IA")
        ),
        React.createElement(Icon, { d: icons.next, size: 18, stroke: 2 })
      ),
      React.createElement('div', { style:{ display:"flex", gap:10, padding:"0 16px 12px", marginTop:-8 } },
        React.createElement('button', {
          style:{ flex:1, background:"linear-gradient(135deg,#0A1A10,#0D1F15)", border:"1px solid #00C9A744",
                  borderRadius:14, padding:"14px 12px", display:"flex", flexDirection:"column",
                  alignItems:"flex-start", gap:6, cursor:"pointer", color:"#fff" },
          onClick: () => goTo("cheat")
        },
          React.createElement('span', { style:{ fontSize:20 } }, "📋"),
          React.createElement('span', { style:{ fontSize:13, fontWeight:700 } }, "Consultar"),
          React.createElement('span', { style:{ fontSize:11, color:"#00C9A7" } }, cheatsheet ? "✓ Carregado" : "Foto → texto")
        ),
        React.createElement('button', {
          style:{ flex:1, background:"linear-gradient(135deg,#0A1A10,#0D1F15)", border:"1px solid #00C9A744",
                  borderRadius:14, padding:"14px 12px", display:"flex", flexDirection:"column",
                  alignItems:"flex-start", gap:6, cursor:"pointer", color:"#fff" },
          onClick: () => goTo("quick")
        },
          React.createElement('span', { style:{ fontSize:20 } }, "⌨️"),
          React.createElement('span', { style:{ fontSize:13, fontWeight:700 } }, "Digitar"),
          React.createElement('span', { style:{ fontSize:11, color:"#00C9A7" } }, "emom, tabata...")
        )
      ),
      cheatsheet && React.createElement('div', {
        style:{ margin:"0 16px 16px", background:"linear-gradient(135deg,#0A1A10,#0D1F15)",
                border:"1px solid #00C9A766", borderRadius:16, padding:"12px 16px",
                display:"flex", gap:12, alignItems:"center", cursor:"pointer" },
        onClick: () => goTo("cheat")
      },
        cheatsheet.preview && React.createElement('img', {
          src: cheatsheet.preview,
          style:{ width:44, height:44, objectFit:"cover", borderRadius:8, flexShrink:0 }
        }),
        React.createElement('div', { style:{ flex:1, minWidth:0 } },
          React.createElement('div', { style:{ color:"#00C9A7", fontSize:10, fontWeight:700, letterSpacing:2 } }, "CONSULTA CARREGADA"),
          React.createElement('div', { style:{ color:"#fff", fontSize:14, fontWeight:700, marginTop:2,
                                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" } },
            cheatsheet.name),
          React.createElement('div', { style:{ color:"#555", fontSize:11, marginTop:2 } },
            cheatsheet.items.length + " itens · toque para ver")
        ),
        React.createElement('button', {
          style:{ background:"none", border:"none", color:"#444", cursor:"pointer", padding:4, fontSize:16 },
          onClick: (e) => { e.stopPropagation(); setCheatsheet(null); }
        }, "✕")
      ),
      latestPr && React.createElement('div', { style: S.prCard, onClick: () => goTo("pr") },
        React.createElement('div', { style: S.prCardLabel }, "ÚLTIMO PR"),
        React.createElement('div', { style: S.prCardExercise }, latestPr.exercise),
        React.createElement('div', { style: S.prCardValue },
          latestPr.value,
          React.createElement('span', { style: S.prCardUnit }, " " + latestPr.unit)
        ),
        React.createElement('div', { style: S.prCardDate }, new Date(latestPr.date).toLocaleDateString("pt-BR"))
      ),
      React.createElement('div', { style: S.section },
        React.createElement('div', { style: S.sectionHeader },
          React.createElement('span', { style: S.sectionTitle }, "TREINOS SALVOS"),
          React.createElement('button', { style: S.sectionBtn, onClick: () => goTo("builder") }, "+ Criar")
        ),
        workouts.length === 0
          ? React.createElement('div', { style: S.empty }, "Nenhum treino salvo ainda.\nCrie o seu primeiro! 🔥")
          : workouts.map((w, i) =>
              React.createElement(WorkoutCard, {
                key: i, workout: w,
                onStart: () => startWorkout(w),
                onDelete: () => saveWorkouts(workouts.filter((_,j) => j !== i)),
                onEdit: () => editWorkout(i),
                onDuplicate: () => duplicateWorkout(i),
                onMoveUp: () => moveWorkout(i, -1),
                onMoveDown: () => moveWorkout(i, 1),
                isFirst: i === 0,
                isLast: i === workouts.length - 1,
              })
            )
      )
    )
  );
}

function WorkoutCard({ workout, onStart, onDelete, onEdit, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }) {
  const totalTime = workout.blocks.reduce((a,b) => a + b.duration, 0);
  return React.createElement('div', { style: S.workoutCard },
    React.createElement('div', { style: S.workoutCardInfo },
      React.createElement('div', { style: S.workoutCardName }, workout.name),
      React.createElement('div', { style: S.workoutCardMeta }, `${workout.blocks.length} blocos · ${fmt(totalTime)}`),
      React.createElement('div', { style: S.blockDots },
        workout.blocks.map((b,i) =>
          React.createElement('div', { key: i, style: { ...S.blockDot, background: BLOCK_COLOR_MAP[b.type] || "#888" } })
        )
      )
    ),
    React.createElement('div', { style: { display:"flex", gap:6, alignItems:"center" } },
      // v12: move up/down
      React.createElement('div', { style: { display:"flex", flexDirection:"column", gap:2 } },
        !isFirst && React.createElement('button', {
          style: { ...S.arrowBtn, fontSize:12, padding:"2px 4px" },
          onClick: onMoveUp
        }, React.createElement(Icon, { d: icons.up, size: 12 })),
        !isLast && React.createElement('button', {
          style: { ...S.arrowBtn, fontSize:12, padding:"2px 4px" },
          onClick: onMoveDown
        }, React.createElement(Icon, { d: icons.down, size: 12 }))
      ),
      React.createElement('button', { style: S.editBtn, onClick: onEdit },
        React.createElement(Icon, { d: icons.edit, size: 14 })
      ),
      React.createElement('button', { style: S.editBtn, onClick: onDuplicate },
        React.createElement(Icon, { d: icons.copy, size: 14 })
      ),
      React.createElement('button', { style: S.deleteBtn, onClick: onDelete }, React.createElement(Icon, { d: icons.trash, size: 16 })),
      React.createElement('button', { style: S.startBtn, onClick: onStart },   React.createElement(Icon, { d: icons.play, size: 18, fill:"white" }))
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  AUDIO ENGINE
// ═══════════════════════════════════════════════════════════════════════════
let AC = null;
let AC_UNLOCKED = false;

function getAC() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}

function unlockAudio() {
  const ctx = getAC();
  ctx.resume().then(() => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.001;
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.001);
    AC_UNLOCKED = true;
  });
}

function tone(freq, dur, vol, type, offset) {
  try {
    const ctx = getAC();
    if (ctx.state === "suspended") ctx.resume();
    const t   = ctx.currentTime + (offset || 0.01);
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type || "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch(e) { console.warn("tone err", e); }
}

function beepTick()    { tone(1046, 0.15, 0.7, "sine", 0.01); vib([50]); }
function beepGo()      { tone(440, 0.5, 0.9, "sawtooth", 0.01); tone(880, 0.3, 0.6, "sine", 0.15); vib([300]); }
function beepEndTick() { tone(2000, 0.06, 0.5, "sine", 0.01); vib([50]); }
function beepDone()    { [0,1,2,3].forEach(i => tone(330+i*110, 0.12, 0.6, "sine", 0.01+i*0.08)); vib([100,50,100,50,200]); }

// v8: vibration helper
function vib(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch {} }

// v11: wake lock — prevent screen from turning off during workout
let _wakeLock = null;
async function requestWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      _wakeLock = await navigator.wakeLock.request("screen");
    }
  } catch {}
}
function releaseWakeLock() {
  if (_wakeLock) { _wakeLock.release().catch(() => {}); _wakeLock = null; }
}

let _speechUnlocked = false;

function unlockSpeech() {
  if (_speechUnlocked || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance("");
  u.volume = 0;
  window.speechSynthesis.speak(u);
  _speechUnlocked = true;
}

function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang   = "en-US";
  u.rate   = 1.05;
  u.pitch  = 1.1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

function speakPt(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang   = "pt-BR";
  u.rate   = 1.05;
  u.pitch  = 1.1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

// ═══════════════════════════════════════════════════════════════════════════
//  TIMER
// ═══════════════════════════════════════════════════════════════════════════
function TimerScreen({ workout, goTo, savePr, cheatsheet, logSession }) {
  const LEAD_IN = 10;

  const [blocks, setBlocks]   = useState(() => workout ? [...workout.blocks] : [{ type:"work", duration:60, label:"Treino Livre" }]);
  const [freeMode]            = useState(!workout);
  const [showPr, setShowPr]   = useState(false);
  const [editFreeIdx, setEditFreeIdx]   = useState(null);   // v3: edit block in free mode
  const [editFreeBlock, setEditFreeBlock] = useState(null); // v3
  const [roundCount, setRoundCount]   = useState(0);        // v7: AMRAP round counter
  const [showCheat, setShowCheat]     = useState(false);    // cheat overlay (timer keeps running)

  const blockIdxRef  = useRef(0);
  const timeLeftRef  = useRef(null);
  const elapsedRef   = useRef(0);
  const leadInRef    = useRef(0);
  const leadDoneRef  = useRef(false);
  const runningRef   = useRef(false);
  const doneRef      = useRef(false);
  const cuesFiredRef = useRef(new Set());
  const intervalRef  = useRef(null);

  const [blockIdx, setBlockIdxD] = useState(0);
  const [timeLeft, setTimeLeftD] = useState(null);
  const [elapsed,  setElapsedD]  = useState(0);
  const [leadIn,   setLeadInD]   = useState(0);
  const [running,  setRunningD]  = useState(false);
  const [done,     setDoneD]     = useState(false);

  const currentBlock = blocks[blockIdxRef.current] || blocks[0];
  const accent       = BLOCK_COLOR_MAP[currentBlock?.type] || "#FF6B35";

  const setBlockIdx = (v) => { blockIdxRef.current = v; setBlockIdxD(v); };
  const setTimeLeft = (v) => { timeLeftRef.current = v; setTimeLeftD(v); };
  const setElapsed  = (v) => { elapsedRef.current  = v; setElapsedD(v);  };
  const setLeadIn   = (v) => { leadInRef.current   = v; setLeadInD(v);   };
  const setRunning  = (v) => { runningRef.current  = v; setRunningD(v);  };
  const setDone     = (v) => { doneRef.current     = v; setDoneD(v);     };

  // v11: wake lock — keep screen on while running
  useEffect(() => {
    if (running) requestWakeLock();
    else releaseWakeLock();
    return () => releaseWakeLock();
  }, [running]);

  useEffect(() => {
    if (!freeMode && timeLeftRef.current === null && currentBlock)
      setTimeLeft(currentBlock.duration);
  }, [freeMode, currentBlock]);

  const blocksRef  = useRef(blocks);
  blocksRef.current = blocks;

  const goNext = useCallback(() => {
    beepDone();
    cuesFiredRef.current = new Set();
    const idx = blockIdxRef.current;
    const blks = blocksRef.current;
    if (idx < blks.length - 1) {
      const n = idx + 1;
      setBlockIdx(n);
      setTimeLeft(blks[n].duration);
      // Announce block transitions
      const nextBlock = blks[n];
      if (nextBlock.type === "rest") {
        setTimeout(() => speak("Rest"), 300);
      } else if (nextBlock.type === "work") {
        // Count which work round this is (1-based)
        let workCount = 0;
        for (let i = 0; i <= n; i++) { if (blks[i].type === "work") workCount++; }
        setTimeout(() => speakPt("Round " + workCount), 300);
      }
    } else {
      setDone(true);
      setRunning(false);
      clearInterval(intervalRef.current);
      logSession(workout, elapsedRef.current); // v4: log to history
    }
  }, [workout]);

  const tickRef = useRef(null);
  tickRef.current = () => {
    if (leadInRef.current > 0) {
      const n = leadInRef.current - 1;
      setLeadIn(n);
      if (n > 0 && n <= 3) beepTick();
      if (n === 0) {
        beepGo();
        leadDoneRef.current = true;
        // Announce first block
        const firstBlock = blocksRef.current[blockIdxRef.current];
        if (firstBlock && firstBlock.type === "work") {
          setTimeout(() => speakPt("Round 1"), 400);
        }
      }
      return;
    }
    if (freeMode) { setElapsed(elapsedRef.current + 1); return; }

    const prev  = timeLeftRef.current ?? 0;
    const next  = prev - 1;
    const fired = cuesFiredRef.current;
    const total = blocks[blockIdxRef.current]?.duration ?? prev;
    const half  = Math.floor(total / 2);
    const btype = blocks[blockIdxRef.current]?.type ?? "work";

    setElapsed(elapsedRef.current + 1);

    if (next > 0 && next <= 3 && !fired.has("e"+next)) {
      fired.add("e"+next); beepEndTick();
    }
    if (next === 10 && !fired.has("ten")) {
      fired.add("ten"); speak("Ten seconds");
    }
    if (next === half && next > 10 && !fired.has("half")) {
      fired.add("half");
      speak(btype === "rest" ? "Halfway through rest" : "Halfway there");
    }

    if (next <= 0) { goNext(); return; }
    setTimeLeft(next);
  };

  useEffect(() => {
    if (!running) { clearInterval(intervalRef.current); return; }
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => tickRef.current(), 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const toggleRun = () => {
    if (doneRef.current) return;
    unlockAudio();
    // Play an audible click on start to ensure AudioContext is fully active
    tone(800, 0.05, 0.3, "sine", 0.01);
    unlockSpeech();
    if (!runningRef.current) {
      if (leadInRef.current === 0 && !leadDoneRef.current) setLeadIn(LEAD_IN);
      setRunning(true);
    } else {
      setRunning(false);
    }
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setBlockIdx(0);
    setTimeLeft(blocks[0]?.duration ?? 60);
    setElapsed(0);
    setDone(false);
    setLeadIn(0);
    leadDoneRef.current  = false;
    cuesFiredRef.current = new Set();
    setRoundCount(0); // v7
  };

  const addBlock = (type) => {
    const dur = type === "rest" ? 30 : 60;
    setBlocks(b => [...b, { type, duration: dur, label: BLOCK_LABELS[type] }]);
  };

  // v3: remove block in free mode
  const removeBlockFree = (i) => {
    if (blocks.length <= 1) return;
    setBlocks(b => b.filter((_, j) => j !== i));
    if (blockIdxRef.current >= i && blockIdxRef.current > 0) setBlockIdx(blockIdxRef.current - 1);
  };

  // v3: open edit modal for free mode block
  const openEditFree = (i) => { setEditFreeIdx(i); setEditFreeBlock({ ...blocks[i] }); };
  const saveEditFree = () => {
    setBlocks(b => b.map((bl, i) => i === editFreeIdx ? editFreeBlock : bl));
    setEditFreeIdx(null); setEditFreeBlock(null);
  };

  const R = 150, C = 2 * Math.PI * R;

  const leadProgress   = leadIn > 0 ? 1 - (leadIn / LEAD_IN) : 0;
  const blockProgress  = freeMode ? 0 : currentBlock
    ? 1 - (timeLeft ?? currentBlock.duration) / currentBlock.duration
    : 0;
  const circleProgress = leadIn > 0 ? leadProgress : blockProgress;
  const dash           = C * (1 - circleProgress);

  const isLeadIn  = leadIn > 0;
  const leadColor = "#A29BFE";

  const displayAccent = isLeadIn ? leadColor : accent;
  const isEndingTick  = !isLeadIn && !freeMode && timeLeft !== null && timeLeft <= 3 && timeLeft > 0 && running;

  const circleSize = 380;

  return React.createElement('div', { style: { ...S.screen, background:"#0A0A0F", display:"flex", flexDirection:"column" } },
    React.createElement('div', { style: S.timerHeader },
      React.createElement('button', { style: S.backBtn, onClick: () => { releaseWakeLock(); goTo("home"); } },
        React.createElement(Icon, { d: icons.back, size: 22 })
      ),
      React.createElement('div', { style: S.timerTitle }, workout ? workout.name.toUpperCase() : "LIVRE"),
      React.createElement('div', { style:{ display:"flex", gap:4 } },
        React.createElement('button', {
          style: { ...S.backBtn, color: cheatsheet ? "#00C9A7" : "#555" },
          onClick: () => cheatsheet && setShowCheat(v => !v)
        },
          React.createElement('span', { style:{ fontSize:18 } }, "📋")
        ),
        React.createElement('button', { style: { ...S.backBtn, color:"#F7B731" }, onClick: () => setShowPr(true) },
          React.createElement(Icon, { d: icons.trophy, size: 20 })
        )
      )
    ),
    // Block progress bar (kept, compact)
    !freeMode && React.createElement('div', { style: S.blockBar },
      blocks.map((b, i) =>
        React.createElement('div', {
          key: i,
          style: {
            ...S.blockBarItem,
            background: i <= blockIdx ? BLOCK_COLOR_MAP[b.type] : "#1E1E2E",
            opacity: i <= blockIdx ? 1 : 0.4,
            flex: b.duration,
          }
        })
      )
    ),
    // Big circle — tap to play/pause, centered
    React.createElement('div', {
      style: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:0 }
    },
      React.createElement('div', {
        style: { ...S.timerCircleWrapper, width: circleSize, height: circleSize, cursor:"pointer" },
        onClick: toggleRun
      },
        React.createElement('svg', { width: circleSize, height: circleSize, viewBox:"0 0 340 340" },
          React.createElement('circle', { cx:170, cy:170, r:R, fill:"none", stroke:"#1E1E2E", strokeWidth:10 }),
          React.createElement('circle', {
            cx:170, cy:170, r:R,
            fill:"none", stroke: isEndingTick ? "#FF4444" : displayAccent, strokeWidth:10,
            strokeDasharray: C,
            strokeDashoffset: freeMode && !isLeadIn ? 0 : dash,
            strokeLinecap:"round",
            transform:"rotate(-90 170 170)",
            style:{
              transition:"stroke-dashoffset 0.8s ease, stroke 0.2s",
              filter: isEndingTick ? "drop-shadow(0 0 10px #FF4444)" : isLeadIn ? `drop-shadow(0 0 10px ${leadColor})` : "none",
            }
          })
        ),
        React.createElement('div', { style: S.timerOverlay },
          done
            ? React.createElement('div', { style:{ textAlign:"center" } },
                React.createElement('div', { style:{ fontSize:52, marginBottom:4 } }, "🏁"),
                React.createElement('div', { style:{ color:"#fff", fontSize:24, fontWeight:700 } }, "CONCLUÍDO!"),
                React.createElement('div', { style:{ color:"#888", fontSize:16, marginTop:6 } }, `${fmt(elapsed)} total`),
                roundCount > 0 && React.createElement('div', { style:{ color:"#FF6B35", fontSize:18, fontWeight:700, marginTop:4 } }, `${roundCount} rounds`)
              )
            : isLeadIn
              ? React.createElement('div', { style:{ textAlign:"center" } },
                  React.createElement('div', { style:{ color: leadColor, fontSize:13, fontWeight:700, letterSpacing:3, marginBottom:8 } }, "PREPARAR"),
                  React.createElement('div', { style:{
                    ...S.timerDisplay,
                    fontSize: leadIn <= 3 ? 110 : 90,
                    color: leadIn <= 3 ? "#FF4444" : "#fff",
                    transition:"font-size 0.1s, color 0.1s",
                  }}, String(leadIn)),
                  React.createElement('div', { style:{ color:"#555", fontSize:14, marginTop:8 } }, "começa em breve...")
                )
              : React.createElement(React.Fragment, null,
                  React.createElement('div', { style:{ ...S.timerLabel, color: isEndingTick ? "#FF4444" : accent, fontSize:13 } },
                    freeMode ? "LIVRE" : (currentBlock?.label || BLOCK_LABELS[currentBlock?.type] || "TREINO")
                  ),
                  React.createElement('div', { style:{
                    ...S.timerDisplay,
                    fontSize: isEndingTick ? 90 : 76,
                    color: isEndingTick ? "#FF4444" : "#fff",
                    transition:"font-size 0.15s, color 0.15s",
                  }},
                    freeMode ? fmt(elapsed) : fmt(timeLeft ?? (currentBlock?.duration ?? 0))
                  ),
                  // Play/pause hint icon inside circle
                  !done && React.createElement('div', { style:{ marginTop:12, opacity:0.35 } },
                    React.createElement(Icon, { d: running ? icons.pause : icons.play, size: 28, fill: running ? "none" : "#fff", stroke: running ? 1.5 : 0 })
                  ),
                  !freeMode && React.createElement('div', { style: { ...S.timerSub, marginTop:4 } }, `${blockIdx+1} / ${blocks.length}`),
                  roundCount > 0 && React.createElement('div', { style:{ color:"#FF6B35", fontSize:14, fontWeight:700, marginTop:2 } }, `${roundCount} rounds`)
                )
        )
      )
    ),
    // Compact controls: reset + next only
    React.createElement('div', { style: { ...S.timerControls, gap:40, paddingBottom:8 } },
      React.createElement('button', { style: S.controlBtn, onClick: reset },
        React.createElement(Icon, { d: icons.stop, size: 22 })
      ),
      !freeMode
        ? React.createElement('button', { style: S.controlBtn, onClick: goNext },
            React.createElement(Icon, { d: icons.next, size: 22 })
          )
        : null
    ),
    // v7: Round counter (AMRAP)
    React.createElement('div', { style:{ display:"flex", justifyContent:"center", gap:12, marginBottom:12 } },
      React.createElement('button', {
        style:{ background:"#1E1E2E", border:"1px solid #FF6B3544", borderRadius:12,
                padding:"10px 24px", color:"#FF6B35", fontSize:14, fontWeight:700,
                cursor:"pointer", display:"flex", alignItems:"center", gap:8 },
        onClick: () => setRoundCount(c => c + 1)
      },
        React.createElement(Icon, { d: icons.add, size: 16 }),
        `Round (${roundCount})`
      ),
      roundCount > 0 && React.createElement('button', {
        style:{ background:"#1E1E2E", border:"1px solid #FF444444", borderRadius:12,
                padding:"10px 14px", color:"#FF4444", fontSize:13, cursor:"pointer" },
        onClick: () => setRoundCount(c => Math.max(0, c - 1))
      }, "−1")
    ),
    !workout && React.createElement('div', { style: S.addBlockRow },
      ["work","rest","warmup"].map(t =>
        React.createElement('button', {
          key: t,
          style:{ ...S.addBlockBtn, borderColor: BLOCK_COLOR_MAP[t] },
          onClick: () => addBlock(t)
        },
          React.createElement('span', { style:{ color: BLOCK_COLOR_MAP[t], fontSize:11, fontWeight:700 } },
            `+ ${BLOCK_LABELS[t]}`
          )
        )
      )
    ),
    // v3: free mode block list with edit + delete (structured mode has no list — uses block bar)
    freeMode && blocks.length > 0 && React.createElement('div', { style: { ...S.blockList, maxHeight: 300 } },
      blocks.map((b, i) =>
        React.createElement('div', { key: i, style: { ...S.blockListItem, borderLeftColor: BLOCK_COLOR_MAP[b.type] } },
          React.createElement('div', {
            style: { display:"flex", alignItems:"center", gap:8, flex:1, cursor:"pointer" },
            onClick: () => openEditFree(i)
          },
            React.createElement('span', { style:{ color: BLOCK_COLOR_MAP[b.type], fontSize:11, fontWeight:700 } }, BLOCK_LABELS[b.type]),
            React.createElement('span', { style:{ color:"#ccc", fontSize:13 } }, b.label),
            React.createElement('span', { style:{ color:"#666", fontSize:12, marginLeft:"auto" } }, fmt(b.duration))
          ),
          blocks.length > 1 && React.createElement('button', {
            style: S.deleteBtn,
            onClick: () => removeBlockFree(i)
          }, React.createElement(Icon, { d: icons.trash, size: 14 }))
        )
      )
    ),
    showPr && React.createElement(PRModal, { onClose: () => setShowPr(false), savePr: (pr) => { savePr(pr); setShowPr(false); } }),
    // v3: block edit modal for free mode
    editFreeBlock && React.createElement(BlockEditModal, {
      block: editFreeBlock,
      onChange: setEditFreeBlock,
      onConfirm: saveEditFree,
      onClose: () => setEditFreeIdx(null),
    }),
    // Cheat overlay — timer keeps running behind
    showCheat && cheatsheet && React.createElement('div', {
      style: {
        position:"fixed", inset:0, background:"rgba(0,0,0,0.92)",
        zIndex:90, overflowY:"auto", WebkitOverflowScrolling:"touch",
        padding:"0 0 40px",
      }
    },
      React.createElement('div', { style: { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"max(52px,env(safe-area-inset-top,48px)) 16px 12px" } },
        React.createElement('div', { style: { color:"#00C9A7", fontSize:15, fontWeight:700, letterSpacing:2 } }, "CONSULTA"),
        React.createElement('button', {
          style: { background:"#00C9A722", border:"1px solid #00C9A744", borderRadius:10, padding:"8px 14px", color:"#00C9A7", fontSize:13, fontWeight:700, cursor:"pointer" },
          onClick: () => setShowCheat(false)
        }, "✕ Voltar ao Timer")
      ),
      cheatsheet.preview && React.createElement('div', { style: { padding:"0 16px 12px", display:"flex", gap:12, alignItems:"center" } },
        React.createElement('img', { src: cheatsheet.preview, style: { width:48, height:48, objectFit:"cover", borderRadius:8, flexShrink:0 } }),
        React.createElement('div', null,
          React.createElement('div', { style: { color:"#fff", fontSize:17, fontWeight:800 } }, cheatsheet.name),
          React.createElement('div', { style: { color:"#666", fontSize:12, marginTop:2 } }, (cheatsheet.items?.length || 0) + " exercícios")
        )
      ),
      React.createElement('div', { style: { padding:"0 16px" } },
        (cheatsheet.items || []).map((item, i) =>
          React.createElement('div', { key: i, style: { background:"#13131A", borderRadius:12, padding:"14px 16px", marginBottom:8, borderLeft:"4px solid #00C9A7" } },
            React.createElement('div', { style: { color:"#fff", fontSize:20, fontWeight:600, lineHeight:1.5 } }, item)
          )
        )
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  PR SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function PRScreen({ prs, savePrs, goTo }) {
  const [showAdd, setShowAdd] = useState(false);
  const grouped = prs.reduce((acc, pr) => {
    const g = pr.exercise || "Geral";
    if (!acc[g]) acc[g] = [];
    acc[g].push(pr);
    return acc;
  }, {});

  return React.createElement('div', { style: S.screen },
    React.createElement('div', { style: S.screenHeader },
      React.createElement('button', { style: S.backBtn, onClick: () => goTo("home") },
        React.createElement(Icon, { d: icons.back, size: 22 })
      ),
      React.createElement('div', { style: S.screenHeaderTitle }, "PERSONAL RECORDS"),
      React.createElement('button', { style:{ ...S.backBtn, color:"#FF6B35" }, onClick: () => setShowAdd(true) },
        React.createElement(Icon, { d: icons.add, size: 24, stroke: 2.5 })
      )
    ),
    prs.length === 0
      ? React.createElement('div', { style: S.prEmpty },
          React.createElement('div', { style:{ fontSize:56, marginBottom:16 } }, "🏆"),
          React.createElement('div', { style:{ color:"#fff", fontSize:18, fontWeight:700 } }, "Nenhum PR ainda!"),
          React.createElement('div', { style:{ color:"#666", fontSize:14, marginTop:8, textAlign:"center" } },
            "Registre seus recordes durante ou após o treino."
          )
        )
      : React.createElement('div', { style:{ padding:"0 16px 100px", overflowY:"auto" } },
          Object.entries(grouped).map(([exercise, records]) =>
            React.createElement('div', { key: exercise, style: S.prGroup },
              React.createElement('div', { style: S.prGroupTitle }, exercise),
              records.map((pr, i) =>
                React.createElement('div', { key: i, style: S.prRow },
                  React.createElement('div', { style: S.prRowLeft },
                    React.createElement('div', { style: S.prRowValue },
                      pr.value,
                      React.createElement('span', { style: S.prRowUnit }, " " + pr.unit)
                    ),
                    pr.notes && React.createElement('div', { style: S.prRowNotes }, pr.notes)
                  ),
                  React.createElement('div', { style:{ display:"flex", alignItems:"center", gap:12 } },
                    React.createElement('div', { style: S.prRowDate },
                      new Date(pr.date).toLocaleDateString("pt-BR")
                    ),
                    React.createElement('button', {
                      style: S.deleteBtn,
                      onClick: () => savePrs(prs.filter(p => p !== pr))
                    },
                      React.createElement(Icon, { d: icons.trash, size: 14 })
                    )
                  )
                )
              )
            )
          )
        ),
    showAdd && React.createElement(PRModal, {
      onClose: () => setShowAdd(false),
      savePr: (pr) => { savePrs([pr, ...prs]); setShowAdd(false); }
    })
  );
}

function PRModal({ onClose, savePr }) {
  const [exercise, setExercise] = useState("");
  const [value, setValue]       = useState("");
  const [unit, setUnit]         = useState("kg");
  const [notes, setNotes]       = useState("");
  const units = ["kg","lbs","reps","km","min","seg","%"];

  const submit = () => {
    if (!exercise || !value) return;
    savePr({ exercise, value, unit, notes, date: new Date().toISOString() });
    onClose();
  };

  return React.createElement('div', { style: S.modalOverlay },
    React.createElement('div', { style: S.modal },
      React.createElement('div', { style: S.modalHeader },
        React.createElement('span', { style: S.modalTitle }, "🏆 NOVO PR"),
        React.createElement('button', { style: S.modalClose, onClick: onClose },
          React.createElement(Icon, { d: icons.close, size: 20 })
        )
      ),
      React.createElement('input', {
        style: S.input, placeholder: "Exercício (ex: Agachamento)",
        value: exercise, onChange: e => setExercise(e.target.value)
      }),
      React.createElement('div', { style:{ display:"flex", gap:8, marginBottom:12 } },
        React.createElement('input', {
          style:{ ...S.input, flex:1, marginBottom:0 },
          type:"number", placeholder:"Valor",
          value, onChange: e => setValue(e.target.value)
        }),
        React.createElement('div', { style: S.unitRow },
          units.map(u =>
            React.createElement('button', {
              key: u,
              style:{ ...S.unitBtn, background: unit===u ? "#FF6B35" : "#1E1E2E", color: unit===u ? "#fff" : "#888" },
              onClick: () => setUnit(u)
            }, u)
          )
        )
      ),
      React.createElement('input', {
        style: S.input, placeholder: "Observações (opcional)",
        value: notes, onChange: e => setNotes(e.target.value)
      }),
      React.createElement('button', { style: S.submitBtn, onClick: submit }, "SALVAR PR")
    )
  );
}

function BlockEditModal({ block, onChange, onConfirm, onClose }) {
  const toStr = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;
  const [inputVal, setInputVal] = useState(() => toStr(block.duration));
  const [inputErr, setInputErr] = useState(false);

  const parse = (raw) => {
    const s = raw.trim();
    const colonMatch = s.match(/^(\d{1,3}):(\d{2})$/);
    if (colonMatch) {
      const total = parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
      return total >= 1 ? total : null;
    }
    const num = parseInt(s);
    if (!isNaN(num) && num >= 1) return num;
    return null;
  };

  const applyInput = (raw) => {
    const secs = parse(raw);
    if (secs) { onChange({ ...block, duration: secs }); setInputErr(false); }
    else        setInputErr(true);
  };

  const adjust = (delta) => {
    const next = Math.max(5, block.duration + delta);
    onChange({ ...block, duration: next });
    setInputVal(toStr(next));
    setInputErr(false);
  };

  const handleBlur = () => applyInput(inputVal);
  const handleKey  = (e) => { if (e.key === "Enter") { applyInput(inputVal); e.target.blur(); } };

  const quickDeltas = [-60, -30, -10, -5, +5, +10, +30, +60];

  return React.createElement('div', { style: S.modalOverlay },
    React.createElement('div', { style: S.modal },
      React.createElement('div', { style: S.modalHeader },
        React.createElement('span', { style: S.modalTitle }, "Editar Bloco"),
        React.createElement('button', { style: S.modalClose, onClick: onClose },
          React.createElement(Icon, { d: icons.close, size: 20 })
        )
      ),
      React.createElement('input', {
        style: S.input, placeholder:"Nome do bloco",
        value: block.label,
        onChange: e => onChange({ ...block, label: e.target.value })
      }),
      React.createElement('div', { style:{ color:"#888", fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 } }, "DURAÇÃO"),
      React.createElement('div', { style:{ position:"relative", marginBottom: inputErr ? 4 : 12 } },
        React.createElement('input', {
          style:{
            ...S.input,
            fontSize: 38, fontWeight: 900, textAlign:"center",
            letterSpacing: 4, marginBottom: 0,
            border: inputErr ? "1px solid #FF4444" : "1px solid #2A2A3A",
            color: inputErr ? "#FF4444" : "#fff",
            padding: "14px 14px",
          },
          value: inputVal,
          onChange: e => setInputVal(e.target.value),
          onBlur: handleBlur,
          onKeyDown: handleKey,
          inputMode: "numeric",
          placeholder: "01:30",
        }),
        React.createElement('div', {
          style:{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", color:"#555", fontSize:11 }
        }, "mm:ss")
      ),
      inputErr && React.createElement('div', { style:{ color:"#FF4444", fontSize:11, marginBottom:8, textAlign:"center" } },
        "Formato inválido. Use mm:ss ou segundos (ex: 90)"
      ),
      React.createElement('div', { style:{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"center", marginBottom:16 } },
        quickDeltas.map(d =>
          React.createElement('button', {
            key: d,
            style:{
              ...S.durationBtn,
              background: d < 0 ? "#1A0A0A" : "#0A1A10",
              color: d < 0 ? "#FF6B6B" : "#00C9A7",
              border: `1px solid ${d < 0 ? "#3A1A1A" : "#1A3A2A"}`,
              fontSize: 12, padding:"7px 10px",
            },
            onClick: () => adjust(d)
          }, (d > 0 ? "+" : "") + (Math.abs(d) >= 60 ? `${d/60 > 0 ? "+" : ""}${d/60}min` : `${d}s`))
        )
      ),
      React.createElement('div', { style:{ color:"#888", fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 } }, "TIPO"),
      React.createElement('div', { style:{ display:"flex", gap:6, marginBottom:20 } },
        ["work","rest","warmup","cooldown"].map(t =>
          React.createElement('button', {
            key: t,
            style:{
              ...S.typeBtn,
              background: block.type===t ? BLOCK_COLOR_MAP[t] : "#1E1E2E",
              color: block.type===t ? "#fff" : "#888",
              fontSize: 10,
            },
            onClick: () => onChange({ ...block, type: t })
          }, BLOCK_LABELS[t])
        )
      ),
      React.createElement('button', { style: S.submitBtn, onClick: onConfirm }, "CONFIRMAR")
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  BUILDER (v1: edit mode, v6: repeat groups)
// ═══════════════════════════════════════════════════════════════════════════
function BuilderScreen({ workouts, saveWorkouts, goTo, editIdx, setEditIdx }) {
  const editing = editIdx !== null && workouts[editIdx];

  const [name, setName]       = useState(editing ? editing.name : "");
  const [blocks, setBlocks]   = useState(editing
    ? editing.blocks.map(b => ({ ...b }))
    : [
        { type:"warmup",  duration:300, label:"Aquecimento" },
        { type:"work",    duration:60,  label:"Exercício"   },
        { type:"rest",    duration:30,  label:"Descanso"    },
      ]
  );
  const [editBlkIdx, setEditBlkIdx]   = useState(null);
  const [editBlock, setEditBlock]     = useState(null);

  // v6: repeat group state
  const [repeatFrom, setRepeatFrom] = useState(null);
  const [repeatTo, setRepeatTo]     = useState(null);
  const [repeatCount, setRepeatCount] = useState(2);

  const totalTime = blocks.reduce((a,b) => a + b.duration, 0);

  const addBlock   = (type) => {
    const dur = type === "rest" ? 30 : type === "warmup" ? 300 : 60;
    setBlocks(b => [...b, { type, duration:dur, label: BLOCK_LABELS[type] }]);
  };
  const removeBlock = (i) => setBlocks(b => b.filter((_,j) => j !== i));
  const openEdit    = (i) => { setEditBlkIdx(i); setEditBlock({ ...blocks[i] }); };
  const saveEdit    = () => {
    setBlocks(b => b.map((bl,i) => i === editBlkIdx ? editBlock : bl));
    setEditBlkIdx(null); setEditBlock(null);
  };
  const moveUp   = (i) => { if (i===0) return; const b=[...blocks]; [b[i-1],b[i]]=[b[i],b[i-1]]; setBlocks(b); };
  const moveDown = (i) => { if (i===blocks.length-1) return; const b=[...blocks]; [b[i],b[i+1]]=[b[i+1],b[i]]; setBlocks(b); };

  // v6: apply repeat
  const applyRepeat = () => {
    if (repeatFrom === null || repeatTo === null) return;
    const from = Math.min(repeatFrom, repeatTo);
    const to = Math.max(repeatFrom, repeatTo);
    const group = blocks.slice(from, to + 1);
    const repeated = [];
    for (let r = 0; r < repeatCount; r++) {
      group.forEach(b => repeated.push({ ...b }));
    }
    setBlocks([...blocks.slice(0, from), ...repeated, ...blocks.slice(to + 1)]);
    setRepeatFrom(null); setRepeatTo(null); setRepeatCount(2);
  };

  const cancelRepeat = () => { setRepeatFrom(null); setRepeatTo(null); setRepeatCount(2); };

  // v6: toggle selection of repeat range
  const toggleRepeatSelect = (i) => {
    if (repeatFrom === null) {
      setRepeatFrom(i); setRepeatTo(i);
    } else if (repeatTo === repeatFrom) {
      setRepeatTo(i);
    } else {
      cancelRepeat();
    }
  };

  const handleSave = () => {
    if (!name || blocks.length === 0) return;
    const w = { name, blocks };
    if (editing) {
      const arr = [...workouts];
      arr[editIdx] = w;
      saveWorkouts(arr);
    } else {
      saveWorkouts([...workouts, w]);
    }
    setEditIdx(null);
    goTo("home");
  };

  // v6: helper to check if block is in selection range
  const inRange = (i) => {
    if (repeatFrom === null) return false;
    const from = Math.min(repeatFrom, repeatTo ?? repeatFrom);
    const to = Math.max(repeatFrom, repeatTo ?? repeatFrom);
    return i >= from && i <= to;
  };

  return React.createElement('div', { style: S.screen },
    React.createElement('div', { style: S.screenHeader },
      React.createElement('button', { style: S.backBtn, onClick: () => { setEditIdx(null); goTo("home"); } },
        React.createElement(Icon, { d: icons.back, size: 22 })
      ),
      React.createElement('div', { style: S.screenHeaderTitle }, editing ? "EDITAR TREINO" : "CRIAR TREINO"),
      React.createElement('button', {
        style:{ ...S.backBtn, color:"#00C9A7", fontSize:14, fontWeight:700 },
        onClick: handleSave
      }, "SALVAR")
    ),
    React.createElement('div', { style:{ padding:"0 16px 120px", overflowY:"auto" } },
      React.createElement('input', {
        style:{ ...S.input, fontSize:20, fontWeight:700, marginBottom:16 },
        placeholder:"Nome do treino...",
        value: name, onChange: e => setName(e.target.value)
      }),
      React.createElement('div', { style: S.builderMeta },
        React.createElement('span', { style:{ color:"#888" } }, `${blocks.length} blocos`),
        React.createElement('span', { style:{ color:"#FF6B35", fontWeight:700 } }, `${fmt(totalTime)} total`)
      ),
      blocks.map((b, i) =>
        React.createElement('div', {
          key: i,
          style: {
            ...S.builderBlock,
            border: inRange(i) ? "1px solid #A29BFE" : "1px solid transparent",
          }
        },
          React.createElement('div', { style:{ ...S.builderBlockAccent, background: BLOCK_COLOR_MAP[b.type] } }),
          React.createElement('div', { style:{ ...S.builderBlockBody, cursor:"pointer" }, onClick: () => openEdit(i) },
            React.createElement('div', { style: S.builderBlockType }, BLOCK_LABELS[b.type]),
            React.createElement('div', { style: S.builderBlockLabel }, b.label)
          ),
          React.createElement('div', { style:{ ...S.builderBlockTime, cursor:"pointer" }, onClick: () => openEdit(i) },
            fmt(b.duration)
          ),
          React.createElement('div', { style:{ display:"flex", flexDirection:"column", gap:2 } },
            React.createElement('button', { style: S.arrowBtn, onClick: () => moveUp(i) },   "▲"),
            React.createElement('button', { style: S.arrowBtn, onClick: () => moveDown(i) }, "▼")
          ),
          // v6: repeat selection button
          React.createElement('button', {
            style: {
              ...S.editBtn,
              color: inRange(i) ? "#A29BFE" : "#555",
              borderColor: inRange(i) ? "#A29BFE" : "#333",
              padding: "4px 6px",
            },
            onClick: () => toggleRepeatSelect(i)
          }, React.createElement(Icon, { d: icons.repeat, size: 12 })),
          React.createElement('button', { style: S.deleteBtn, onClick: () => removeBlock(i) },
            React.createElement(Icon, { d: icons.trash, size: 14 })
          )
        )
      ),

      // v6: repeat controls panel
      repeatFrom !== null && React.createElement('div', {
        style: {
          background: "#1A1A2E", border: "1px solid #A29BFE44", borderRadius: 12,
          padding: "12px 14px", marginTop: 8, marginBottom: 12
        }
      },
        React.createElement('div', { style: { color: "#A29BFE", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 } }, "REPETIR GRUPO"),
        React.createElement('div', { style: { color: "#888", fontSize: 12, marginBottom: 10 } },
          `Blocos ${Math.min(repeatFrom, repeatTo ?? repeatFrom) + 1} a ${Math.max(repeatFrom, repeatTo ?? repeatFrom) + 1} selecionados`
        ),
        React.createElement('div', { style: { display: "flex", gap: 6, alignItems: "center", marginBottom: 12 } },
          React.createElement('span', { style: { color: "#fff", fontSize: 13 } }, "Repetir"),
          [2, 3, 4, 5, 6, 8, 10].map(n =>
            React.createElement('button', {
              key: n,
              style: {
                background: repeatCount === n ? "#A29BFE" : "#1E1E2E",
                border: "none", borderRadius: 6, padding: "6px 10px",
                color: repeatCount === n ? "#fff" : "#666",
                fontSize: 12, fontWeight: 700, cursor: "pointer",
              },
              onClick: () => setRepeatCount(n)
            }, `${n}x`)
          )
        ),
        React.createElement('div', { style: { display: "flex", gap: 8 } },
          React.createElement('button', {
            style: { ...S.sectionBtn, flex: 1, textAlign: "center" },
            onClick: cancelRepeat
          }, "Cancelar"),
          React.createElement('button', {
            style: { ...S.submitBtn, flex: 2, padding: "10px" },
            onClick: applyRepeat
          }, `Aplicar ${repeatCount}x`)
        )
      ),

      React.createElement('div', { style: S.addBlockGrid },
        ["work","rest","warmup","cooldown"].map(t =>
          React.createElement('button', {
            key: t,
            style:{ ...S.addTypeBtn, borderColor: BLOCK_COLOR_MAP[t] },
            onClick: () => addBlock(t)
          },
            React.createElement('span', { style:{ color: BLOCK_COLOR_MAP[t], fontSize:12, fontWeight:700 } },
              `+ ${BLOCK_LABELS[t]}`
            )
          )
        )
      )
    ),

    editBlock && React.createElement(BlockEditModal, {
      block: editBlock,
      onChange: setEditBlock,
      onConfirm: saveEdit,
      onClose: () => setEditBlkIdx(null),
    })
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  SCAN SCREEN (fixed: no duplicate button, fileRef for "Escolher Foto")
// ═══════════════════════════════════════════════════════════════════════════
function ScanScreen({ goTo, saveWorkouts, workouts, startWorkout }) {
  const [phase, setPhase]       = useState("idle");
  const [preview, setPreview]   = useState(null);
  const [result, setResult]     = useState(null);
  const [errMsg, setErrMsg]     = useState("");
  const [editIdx, setEditIdx]   = useState(null);
  const [editBlock, setEditBlock] = useState(null);
  const fileRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      setPhase("loading");
      setResult(null);
      setErrMsg("");
      await analyzeImage(dataUrl, file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const analyzeImage = async (dataUrl, mediaType) => {
    const base64 = dataUrl.split(",")[1];
    const safeType = ["image/jpeg","image/png","image/gif","image/webp"].includes(mediaType)
      ? mediaType : "image/jpeg";

    const prompt = `Você é um assistente de timer de treino. Analise a imagem e extraia APENAS as informações de TEMPO para montar um cronômetro.

Retorne APENAS um JSON válido (sem markdown, sem texto extra) com este formato exato:
{
  "name": "nome do treino ou modalidade identificada",
  "blocks": [
    { "type": "work|rest|cooldown", "label": "nome curto do bloco", "duration": segundos_como_numero }
  ]
}

Regras OBRIGATÓRIAS:
- Foque SOMENTE em tempos explícitos: "1:30", "90s", "2 min", "Rest 1:30", etc.
- Se houver N rounds/sets repetindo o mesmo padrão tempo-trabalho + tempo-descanso, crie N pares de blocos (work + rest).
- NÃO adicione aquecimento automático.
- NÃO invente tempos baseados em repetições ou séries sem tempo.
- "type": use "work" para esforço, "rest" para descanso, "cooldown" para volta à calma.
- "duration" em segundos (número inteiro).
- label em português, curto (máx 30 caracteres).
- Mínimo 1 bloco, máximo 50.`;

    try {
      const res = await fetch(window.location.hostname.includes("netlify") ? "/.netlify/functions/analyze" : "/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: safeType, data: base64 } },
              { type: "text",  text: prompt }
            ]
          }]
        })
      });

      const rawText = await res.text();
      if (!res.ok) {
        let msg = `Erro ${res.status}`;
        try { const j = JSON.parse(rawText); msg = j?.error?.message || j?.error || msg; } catch {}
        throw new Error(msg);
      }

      let data;
      try { data = JSON.parse(rawText); } catch { throw new Error("Resposta inválida do servidor."); }

      const raw  = (data.content || []).map(c => c.text || "").join("").trim();
      if (!raw) throw new Error("Servidor não retornou conteúdo.");
      const clean = raw.replace(/^```[\w]*\n?/,"").replace(/\n?```$/,"").trim();
      let parsed;
      try { parsed = JSON.parse(clean); } catch { throw new Error("IA não retornou JSON válido: " + raw.slice(0,120)); }

      if (!parsed.blocks || !Array.isArray(parsed.blocks) || parsed.blocks.length === 0)
        throw new Error("Nenhum bloco identificado na imagem.");

      const validTypes = ["work","rest","warmup","cooldown"];
      parsed.blocks = parsed.blocks.map(b => ({
        type:     validTypes.includes(b.type) ? b.type : "work",
        label:    String(b.label || "Exercício").slice(0,40),
        duration: Math.max(5, Math.min(7200, parseInt(b.duration) || 60)),
      }));

      setResult(parsed);
      setPhase("preview");
    } catch (err) {
      setErrMsg(err.message || "Erro ao analisar imagem.");
      setPhase("error");
    }
  };

  const saveAndStart = () => {
    if (!result) return;
    saveWorkouts([...workouts, result]);
    startWorkout(result);
  };

  const saveOnly = () => {
    if (!result) return;
    saveWorkouts([...workouts, result]);
    goTo("home");
  };

  const openEdit = (i) => { setEditIdx(i); setEditBlock({ ...result.blocks[i] }); };
  const saveEdit = () => {
    const blocks = result.blocks.map((b,i) => i === editIdx ? editBlock : b);
    setResult({ ...result, blocks });
    setEditIdx(null); setEditBlock(null);
  };
  const removeBlock = (i) => setResult({ ...result, blocks: result.blocks.filter((_,j) => j !== i) });

  const totalTime = result ? result.blocks.reduce((a,b) => a + b.duration, 0) : 0;

  return React.createElement('div', { style: S.screen },
    React.createElement('div', { style: S.screenHeader },
      React.createElement('button', { style: S.backBtn, onClick: () => goTo("home") },
        React.createElement(Icon, { d: icons.back, size: 22 })
      ),
      React.createElement('div', { style: S.screenHeaderTitle }, "ESCANEAR TREINO"),
      React.createElement('div', { style:{ width:32 } })
    ),

    React.createElement('div', { style:{ padding:"0 16px 16px" } },
      React.createElement('div', { style:{ color:"#888", fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:8 } }, "FOTO DO TREINO"),
      React.createElement('input', {
        ref: fileRef,
        type:"file", accept:"image/*", onChange: handleFile,
        style:{ display:"block", width:"100%", padding:"13px 14px",
                background:"#13131A", border:"1.5px dashed #4361EE",
                borderRadius:14, color:"#A29BFE", fontSize:14,
                fontWeight:600, cursor:"pointer", boxSizing:"border-box" }
      })
    ),

    phase === "idle" && React.createElement('div', { style: { ...S.scanIdle, minHeight:"50vh" } },
      React.createElement('div', { style: S.scanIllustration }, "📋"),
      React.createElement('div', { style:{ color:"#fff", fontSize:20, fontWeight:800, marginBottom:8 } }, "Foto do seu treino"),
      React.createElement('div', { style:{ color:"#666", fontSize:14, lineHeight:1.7, textAlign:"center", maxWidth:260 } },
        "Tire uma foto de qualquer treino: papel, lousa, print de app, planilha... A IA vai ler e montar os blocos automaticamente."
      )
    ),

    phase === "loading" && React.createElement('div', { style: S.scanLoading },
      preview && React.createElement('img', { src: preview, style: S.scanPreviewImg, alt: "treino" }),
      React.createElement('div', { style: S.scanSpinnerWrap },
        React.createElement('div', { style: S.scanSpinner }),
        React.createElement('div', { style:{ color:"#A29BFE", fontSize:14, fontWeight:700, marginTop:12 } }, "Analisando treino..."),
        React.createElement('div', { style:{ color:"#555", fontSize:12, marginTop:4 } }, "A IA está lendo os exercícios")
      )
    ),

    phase === "error" && React.createElement('div', { style: { ...S.scanIdle, minHeight:"40vh" } },
      React.createElement('div', { style:{ fontSize:48, marginBottom:12 } }, "⚠️"),
      React.createElement('div', { style:{ color:"#FF4444", fontSize:16, fontWeight:700, marginBottom:8 } }, "Não foi possível analisar"),
      React.createElement('div', { style:{ color:"#666", fontSize:13, textAlign:"center", maxWidth:280, marginBottom:24, lineHeight:1.6 } }, errMsg),
      React.createElement('div', { style:{ color:"#555", fontSize:13 } }, "Toque no campo acima para tentar novamente"),
    ),

    phase === "preview" && result && React.createElement('div', { style:{ padding:"0 16px 120px", overflowY:"auto" } },
      React.createElement('div', { style: S.scanResultHeader },
        preview && React.createElement('img', { src: preview, style: S.scanThumb, alt:"" }),
        React.createElement('div', { style:{ flex:1 } },
          React.createElement('input', {
            style:{ ...S.input, marginBottom:0, fontSize:17, fontWeight:700 },
            value: result.name,
            onChange: e => setResult({ ...result, name: e.target.value })
          }),
          React.createElement('div', { style:{ color:"#666", fontSize:12, marginTop:6 } },
            `${result.blocks.length} blocos · ${fmt(totalTime)} total`
          )
        )
      ),
      React.createElement('div', { style:{ color:"#888", fontSize:11, fontWeight:700, letterSpacing:2, marginBottom:10 } }, "BLOCOS DETECTADOS"),
      result.blocks.map((b, i) =>
        React.createElement('div', { key:i, style: S.scanBlock },
          React.createElement('div', { style:{ ...S.builderBlockAccent, background: BLOCK_COLOR_MAP[b.type] } }),
          React.createElement('div', { style:{ ...S.builderBlockBody, cursor:"pointer" }, onClick: () => openEdit(i) },
            React.createElement('div', { style: S.builderBlockType }, BLOCK_LABELS[b.type]),
            React.createElement('div', { style: S.builderBlockLabel }, b.label)
          ),
          React.createElement('div', { style:{ ...S.builderBlockTime, cursor:"pointer" }, onClick: () => openEdit(i) }, fmt(b.duration)),
          React.createElement('button', { style: S.deleteBtn, onClick: () => removeBlock(i) },
            React.createElement(Icon, { d: icons.trash, size: 14 })
          )
        )
      ),
      React.createElement('div', { style: S.scanActions },
        React.createElement('button', { style:{ ...S.submitBtn, background:"#1E1E2E", flex:1 }, onClick: saveOnly }, "Salvar"),
        React.createElement('button', { style:{ ...S.submitBtn, flex:2 }, onClick: saveAndStart }, "▶  Iniciar Agora")
      )
    ),
    editBlock && React.createElement(BlockEditModal, {
      block: editBlock, onChange: setEditBlock, onConfirm: saveEdit, onClose: () => setEditIdx(null),
    })
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  WORKOUT TEXT PARSER
// ═══════════════════════════════════════════════════════════════════════════
function parseWorkoutText(raw) {
  const txt = raw.trim().toLowerCase();
  function parseTime(str) {
    str = str.trim();
    let m = str.match(/^(\d+):(\d{2})$/); if (m) return parseInt(m[1])*60 + parseInt(m[2]);
    m = str.match(/^(\d+)m(\d+)s?$/); if (m) return parseInt(m[1])*60 + parseInt(m[2]);
    m = str.match(/^(\d+)\s*(min|m)$/); if (m) return parseInt(m[1])*60;
    m = str.match(/^(\d+)\s*s(ec)?$/); if (m) return parseInt(m[1]);
    m = str.match(/^(\d+)$/); if (m) { const n=parseInt(m[1]); return n<=120 ? n : n*60; }
    return null;
  }

  let m = txt.match(/emom\s+(\S+)(?:\s+(\S+)\s*(?:work|on))?(?:\s+(\S+)\s*(?:rest|off))?/);
  if (m) { const total=parseTime(m[1]),wd=m[2]?parseTime(m[2]):60,rd=m[3]?parseTime(m[3]):null; if(total&&wd){const rounds=Math.round(total/(rd?(wd+rd)/60:1));const blocks=[];for(let i=0;i<rounds;i++){blocks.push({type:"work",label:`Min ${i+1}`,duration:wd});if(rd)blocks.push({type:"rest",label:"Descanso",duration:rd});}return{name:`EMOM ${m[1].toUpperCase()}`,blocks};}}

  m = txt.match(/tabata(?:\s+(\S+))?(?:\s+(\S+))?(?:\s+(\d+))?/);
  if (m && txt.includes("tabata")) { let wd=20,rd=10,rounds=8;if(m[1]){const t=parseTime(m[1]);if(t)wd=t;else if(parseInt(m[1]))rounds=parseInt(m[1]);}if(m[2]){const t=parseTime(m[2]);if(t)rd=t;}if(m[3])rounds=parseInt(m[3]);const blocks=[];for(let i=0;i<rounds;i++){blocks.push({type:"work",label:`Round ${i+1}`,duration:wd});if(i<rounds-1)blocks.push({type:"rest",label:"Descanso",duration:rd});}return{name:`TABATA ${rounds}×${wd}s/${rd}s`,blocks};}

  m = txt.match(/amrap\s+(\S+)(?:\s+x\s*(\d+))?(?:\s+rest\s+(\S+))?/);
  if (m) { const dur=parseTime(m[1]),rounds=m[2]?parseInt(m[2]):1,rd=m[3]?parseTime(m[3]):null;if(dur){const blocks=[];for(let i=0;i<rounds;i++){blocks.push({type:"work",label:`AMRAP ${i+1}`,duration:dur});if(rd&&i<rounds-1)blocks.push({type:"rest",label:"Descanso",duration:rd});}return{name:`AMRAP ${m[1].toUpperCase()}${rounds>1?` x${rounds}`:""}`,blocks};}}

  m = txt.match(/(\d+)\s*(?:rounds?|x|sets?)\s+(\S+)(?:\s+(?:work|on))?\s+(\S+)(?:\s+(?:rest|off))?/);
  if (m) { const rounds=parseInt(m[1]),wd=parseTime(m[2]),rd=parseTime(m[3]);if(rounds&&wd&&rd){const blocks=[];for(let i=0;i<rounds;i++){blocks.push({type:"work",label:`Round ${i+1}`,duration:wd});if(i<rounds-1)blocks.push({type:"rest",label:"Descanso",duration:rd});}return{name:`${rounds}x ${m[2]}/${m[3]}`,blocks};}}

  m = txt.match(/(\S+)\s+(?:on|work)\s+(\S+)\s+(?:off|rest)(?:\s+x?\s*(\d+))?/);
  if (m) { const wd=parseTime(m[1]),rd=parseTime(m[2]),rounds=m[3]?parseInt(m[3]):1;if(wd&&rd){const blocks=[];for(let i=0;i<rounds;i++){blocks.push({type:"work",label:`Round ${i+1}`,duration:wd});blocks.push({type:"rest",label:"Descanso",duration:rd});}return{name:`Intervalo ${m[1]}/${m[2]}${rounds>1?` x${rounds}`:""}`,blocks};}}

  const simple = parseTime(txt.replace(/[a-z\s]/g,"").trim()) || parseTime(txt.split(" ")[0]);
  if (simple) return { name: "Treino " + raw.trim(), blocks:[{ type:"work", label:"Treino", duration: simple }] };
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
//  QUICK TEXT SCREEN
// ═══════════════════════════════════════════════════════════════════════════
function QuickTextScreen({ goTo, saveWorkouts, workouts, startWorkout }) {
  const [input, setInput]=useState("");const [result, setResult]=useState(null);const [error, setError]=useState("");
  const examples=[{label:"EMOM 20",desc:"20 blocos de 1 min"},{label:"tabata",desc:"8× 20s/10s"},{label:"amrap 1:30 x6 rest 1:30",desc:"6 rounds AMRAP"},{label:"6 rounds 1:30 1:30",desc:"6× trabalho + descanso"},{label:"20s on 10s off x8",desc:"intervalos custom"},{label:"emom 30 40s work 20s rest",desc:"EMOM com descanso"}];
  const parse=(txt)=>{const r=parseWorkoutText(txt||input);if(r&&r.blocks.length>0){setResult(r);setError("");}else{setResult(null);setError("Não entendi. Tente: emom 20, tabata, 6 rounds 1:30 1:30");}};
  const total=result?result.blocks.reduce((a,b)=>a+b.duration,0):0;
  const saveAndStart=()=>{if(!result)return;saveWorkouts([...workouts,result]);startWorkout(result);};
  const saveOnly=()=>{if(!result)return;saveWorkouts([...workouts,result]);goTo("home");};

  return React.createElement('div',{style:S.screen},
    React.createElement('div',{style:S.screenHeader},React.createElement('button',{style:S.backBtn,onClick:()=>goTo("home")},React.createElement(Icon,{d:icons.back,size:22})),React.createElement('div',{style:S.screenHeaderTitle},"DIGITAR TREINO"),React.createElement('div',{style:{width:32}})),
    React.createElement('div',{style:{padding:"0 16px 120px",overflowY:"auto"}},
      React.createElement('div',{style:{position:"relative",marginBottom:8}},React.createElement('input',{style:{...S.input,fontSize:18,fontWeight:600,paddingRight:52,marginBottom:0},placeholder:"emom 20, tabata, amrap 10...",value:input,onChange:e=>{setInput(e.target.value);setResult(null);setError("");},onKeyDown:e=>{if(e.key==="Enter"){e.target.blur();parse();}},autoCapitalize:"none",autoCorrect:"off",spellCheck:false}),input.length>0&&React.createElement('button',{style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"#FF6B35",border:"none",borderRadius:10,padding:"6px 12px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"},onClick:()=>parse()},"IR")),
      error&&React.createElement('div',{style:{color:"#FF4444",fontSize:12,marginBottom:12}},error),
      !result&&React.createElement('div',null,React.createElement('div',{style:{color:"#888",fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:10}},"EXEMPLOS"),examples.map((ex,i)=>React.createElement('button',{key:i,style:{width:"100%",background:"#13131A",border:"1px solid #2A2A3A",borderRadius:12,padding:"12px 14px",marginBottom:8,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"},onClick:()=>{setInput(ex.label);parse(ex.label);}},React.createElement('div',null,React.createElement('div',{style:{color:"#00C9A7",fontSize:14,fontWeight:700,textAlign:"left"}},ex.label),React.createElement('div',{style:{color:"#666",fontSize:12,marginTop:2}},ex.desc)),React.createElement(Icon,{d:icons.next,size:16,stroke:2})))),
      result&&React.createElement('div',null,
        React.createElement('div',{style:{background:"#13131A",borderRadius:14,padding:"14px 16px",marginBottom:16}},React.createElement('div',{style:{color:"#00C9A7",fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:4}},"DETECTADO"),React.createElement('div',{style:{color:"#fff",fontSize:20,fontWeight:800}},result.name),React.createElement('div',{style:{color:"#888",fontSize:13,marginTop:4}},`${result.blocks.length} blocos · ${fmt(total)}`),React.createElement('div',{style:{display:"flex",gap:4,marginTop:10,flexWrap:"wrap"}},result.blocks.map((b,i)=>React.createElement('div',{key:i,style:{background:BLOCK_COLOR_MAP[b.type]+"33",border:`1px solid ${BLOCK_COLOR_MAP[b.type]}66`,borderRadius:6,padding:"3px 7px",fontSize:11,color:BLOCK_COLOR_MAP[b.type],fontWeight:700}},fmt(b.duration))))),
        React.createElement('button',{style:{...S.sectionBtn,width:"100%",padding:"10px",marginBottom:8,textAlign:"center"},onClick:()=>{setResult(null);setInput("");}},"← Tentar outro"),
        React.createElement('div',{style:{display:"flex",gap:10,position:"fixed",bottom:0,left:0,right:0,padding:"12px 16px 32px",background:"#0A0A0F",borderTop:"1px solid #1E1E2E",maxWidth:430,margin:"0 auto"}},React.createElement('button',{style:{...S.submitBtn,background:"#1E1E2E",flex:1},onClick:saveOnly},"Salvar"),React.createElement('button',{style:{...S.submitBtn,flex:2},onClick:saveAndStart},"▶  Iniciar Agora"))
      )
    )
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHEATSHEET
// ═══════════════════════════════════════════════════════════════════════════
function CheatsheetScreen({ goTo, cheatsheet, setCheatsheet, prevScreen }) {
  const [phase, setPhase]=useState(cheatsheet?"done":"idle");const [wk,setWk]=useState(cheatsheet||null);const [err,setErr]=useState("");
  const handleFile=async(e)=>{const file=e.target.files?.[0];if(!file)return;setPhase("loading");setWk(null);setErr("");const reader=new FileReader();reader.onload=async(ev)=>{const dataUrl=ev.target.result,base64=dataUrl.split(",")[1];const st=["image/jpeg","image/png","image/gif","image/webp"].includes(file.type)?file.type:"image/jpeg";const prompt='Analise esta imagem de treino e extraia APENAS os exercicios e pesos/cargas. Retorne JSON valido sem markdown: {"name":"nome do treino","items":["exercicio - peso/carga como aparece"],"notes":""}. Foque em: nome do exercicio, series, repeticoes e peso/carga. Ignore tempos, logos, instrucoes gerais. Formato de cada item: "Exercicio - SxR peso" (ex: "Agachamento - 4x8 80kg"). Max 30 itens.';try{const res=await fetch(window.location.hostname.includes("netlify")?"/.netlify/functions/analyze":"/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:st,data:base64}},{type:"text",text:prompt}]}]})});const rawText=await res.text();if(!res.ok){let j={};try{j=JSON.parse(rawText);}catch{};throw new Error(j?.error?.message||"Erro "+res.status);}const data=JSON.parse(rawText);const raw=(data.content||[]).map(c=>c.text||"").join("").trim();const clean=raw.replace(/^```[\w]*\n?/,"").replace(/\n?```$/,"").trim();const parsed=JSON.parse(clean);if(!parsed.items?.length)throw new Error("Nao foi possivel ler.");const result={...parsed,preview:dataUrl};setWk(result);setCheatsheet(result);setPhase("done");}catch(err){setErr(err.message||"Erro.");setPhase("error");}};reader.readAsDataURL(file);};

  return React.createElement('div',{style:S.screen},
    React.createElement('div',{style:S.screenHeader},React.createElement('button',{style:{...S.backBtn,color:"#888"},onClick:()=>goTo(prevScreen||"home")},React.createElement(Icon,{d:icons.back,size:22})),React.createElement('div',{style:S.screenHeaderTitle},"CONSULTA"),prevScreen==="timer"&&React.createElement('button',{style:{background:"#00C9A722",border:"1px solid #00C9A744",borderRadius:10,padding:"6px 10px",color:"#00C9A7",fontSize:12,fontWeight:700,cursor:"pointer"},onClick:()=>goTo("timer")},"Timer")),
    React.createElement('div',{style:{padding:"12px 16px 0"}},React.createElement('label',{style:{display:"block"}},React.createElement('div',{style:{color:"#888",fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:8}},phase==="done"?"TROCAR FOTO":"CARREGAR FOTO DO TREINO"),React.createElement('input',{type:"file",accept:"image/*",onChange:handleFile,style:{display:"block",width:"100%",padding:"13px 14px",background:"#13131A",border:"1.5px dashed #00C9A7",borderRadius:14,color:"#00C9A7",fontSize:14,fontWeight:600,cursor:"pointer",boxSizing:"border-box"}}))),
    phase==="loading"&&React.createElement('div',{style:{...S.scanIdle,minHeight:"50vh"}},React.createElement('div',{style:{...S.scanSpinner,borderTopColor:"#00C9A7",marginBottom:16}}),React.createElement('div',{style:{color:"#00C9A7",fontSize:14,fontWeight:700}},"Lendo treino...")),
    phase==="error"&&React.createElement('div',{style:{padding:"24px 16px",textAlign:"center"}},React.createElement('div',{style:{color:"#FF4444",fontSize:14,fontWeight:700,marginBottom:8}},"Nao foi possivel ler"),React.createElement('div',{style:{color:"#666",fontSize:12,lineHeight:1.6}},err)),
    phase==="idle"&&React.createElement('div',{style:{padding:"32px 16px",textAlign:"center"}},React.createElement('div',{style:{fontSize:56,marginBottom:12}},"📋"),React.createElement('div',{style:{color:"#555",fontSize:14,lineHeight:1.7}},"Escolha uma foto do seu treino acima.")),
    phase==="done"&&wk&&React.createElement('div',{style:{padding:"12px 16px 60px",overflowY:"auto"}},
      React.createElement('div',{style:{display:"flex",gap:12,alignItems:"center",marginBottom:16}},wk.preview&&React.createElement('img',{src:wk.preview,style:{width:52,height:52,objectFit:"cover",borderRadius:8,flexShrink:0}}),React.createElement('div',{style:{flex:1}},React.createElement('div',{style:{color:"#fff",fontSize:17,fontWeight:800}},wk.name),React.createElement('div',{style:{color:"#666",fontSize:12,marginTop:3}},(wk.items?.length||0)+" exercícios"))),
      (wk.items||[]).map((item,i)=>React.createElement('div',{key:i,style:{background:"#13131A",borderRadius:12,padding:"14px 16px",marginBottom:8,borderLeft:"4px solid #00C9A7"}},React.createElement('div',{style:{color:"#fff",fontSize:20,fontWeight:600,lineHeight:1.5}},item))),
      wk.notes?React.createElement('div',{style:{background:"#0E1A10",border:"1px solid #00C9A744",borderRadius:10,padding:"12px 14px",marginTop:4}},React.createElement('div',{style:{color:"#00C9A7",fontSize:11,fontWeight:700,letterSpacing:2,marginBottom:6}},"NOTAS"),React.createElement('div',{style:{color:"#aaa",fontSize:13,lineHeight:1.6}},wk.notes)):null
    )
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  HISTORY SCREEN (v4)
// ═══════════════════════════════════════════════════════════════════════════
function HistoryScreen({ goTo, hist, saveHist }) {
  // Group by date
  const grouped = {};
  hist.forEach(h => {
    const d = new Date(h.date).toLocaleDateString("pt-BR");
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(h);
  });

  // Stats: last 7 days
  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const weekSessions = hist.filter(h => now - new Date(h.date).getTime() < week);
  const totalWeek = weekSessions.reduce((a, h) => a + (h.duration || 0), 0);

  return React.createElement('div', { style: S.screen },
    React.createElement('div', { style: S.screenHeader },
      React.createElement('button', { style: S.backBtn, onClick: () => goTo("home") },
        React.createElement(Icon, { d: icons.back, size: 22 })
      ),
      React.createElement('div', { style: S.screenHeaderTitle }, "HISTÓRICO"),
      React.createElement('button', {
        style: { ...S.backBtn, color: "#FF4444", fontSize: 11 },
        onClick: () => { if (confirm("Limpar todo histórico?")) saveHist([]); }
      }, "Limpar")
    ),

    // Week summary card
    React.createElement('div', {
      style: { margin: "0 16px 20px", background: "linear-gradient(135deg,#1A1A2E,#16213E)", borderRadius: 16, padding: "16px 20px" }
    },
      React.createElement('div', { style: { color: "#A29BFE", fontSize: 10, fontWeight: 700, letterSpacing: 2 } }, "ÚLTIMOS 7 DIAS"),
      React.createElement('div', { style: { color: "#fff", fontSize: 32, fontWeight: 900, marginTop: 4 } }, fmt(totalWeek)),
      React.createElement('div', { style: { color: "#666", fontSize: 12, marginTop: 2 } }, weekSessions.length + " sessões")
    ),

    hist.length === 0
      ? React.createElement('div', { style: S.prEmpty },
          React.createElement('div', { style: { fontSize: 56, marginBottom: 16 } }, "📊"),
          React.createElement('div', { style: { color: "#fff", fontSize: 18, fontWeight: 700 } }, "Sem histórico"),
          React.createElement('div', { style: { color: "#666", fontSize: 14, marginTop: 8 } }, "Complete um treino para registrar.")
        )
      : React.createElement('div', { style: { padding: "0 16px 60px" } },
          Object.entries(grouped).map(([date, sessions]) =>
            React.createElement('div', { key: date, style: { marginBottom: 20 } },
              React.createElement('div', { style: { color: "#666", fontSize: 11, fontWeight: 700, letterSpacing: 2, marginBottom: 8 } }, date),
              sessions.map((s, i) =>
                React.createElement('div', {
                  key: i,
                  style: { background: "#13131A", borderRadius: 12, padding: "12px 14px", marginBottom: 6,
                           display: "flex", justifyContent: "space-between", alignItems: "center" }
                },
                  React.createElement('div', null,
                    React.createElement('div', { style: { color: "#fff", fontSize: 15, fontWeight: 700 } }, s.name),
                    React.createElement('div', { style: { color: "#666", fontSize: 12, marginTop: 2 } },
                      (s.blocks || 0) + " blocos"
                    )
                  ),
                  React.createElement('div', { style: { textAlign: "right" } },
                    React.createElement('div', { style: { color: "#FF6B35", fontSize: 16, fontWeight: 800 } }, fmt(s.duration || 0)),
                    React.createElement('div', { style: { color: "#555", fontSize: 11 } },
                      new Date(s.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    )
                  )
                )
              )
            )
          )
        )
  );
}


// ═══════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════
const S = {
  screen:{height:"100vh",background:"#0A0A0F",overflowY:"scroll",WebkitOverflowScrolling:"touch",paddingBottom:80,fontFamily:"'-apple-system',BlinkMacSystemFont,'SF Pro Display',sans-serif"},
  homeHeader:{padding:"env(safe-area-inset-top,52px) 20px 20px",paddingTop:"max(52px,env(safe-area-inset-top,52px))",display:"flex",justifyContent:"space-between",alignItems:"flex-start"},
  greeting:{color:"#888",fontSize:14,marginBottom:4,letterSpacing:1},homeTitle:{color:"#fff",fontSize:42,fontWeight:900,lineHeight:1.05,letterSpacing:-1,whiteSpace:"pre-line"},
  prBadge:{background:"#1E1E2E",borderRadius:14,padding:"12px 14px",display:"flex",flexDirection:"column",alignItems:"center",gap:4,cursor:"pointer",color:"#F7B731"},prCount:{color:"#fff",fontSize:18,fontWeight:700},
  quickActions:{display:"flex",gap:12,padding:"0 16px 20px"},quickBtn:{flex:1,border:"none",borderRadius:18,padding:"20px 14px",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:8,cursor:"pointer",color:"#fff",fontSize:14,fontWeight:700},
  prCard:{margin:"0 16px 20px",background:"linear-gradient(135deg,#F7B731 0%,#FF6B35 100%)",borderRadius:18,padding:"16px 20px",cursor:"pointer"},prCardLabel:{fontSize:11,fontWeight:700,letterSpacing:2,color:"rgba(0,0,0,0.5)",marginBottom:4},prCardExercise:{fontSize:18,fontWeight:700,color:"#000",marginBottom:2},prCardValue:{fontSize:36,fontWeight:900,color:"#000",lineHeight:1},prCardUnit:{fontSize:16,fontWeight:400},prCardDate:{fontSize:12,color:"rgba(0,0,0,0.5)",marginTop:4},
  section:{padding:"0 16px"},sectionHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12},sectionTitle:{color:"#666",fontSize:12,fontWeight:700,letterSpacing:2},sectionBtn:{background:"none",border:"1px solid #333",borderRadius:8,padding:"4px 10px",color:"#FF6B35",fontSize:13,cursor:"pointer"},
  empty:{color:"#444",fontSize:14,textAlign:"center",padding:"32px 0",lineHeight:1.8,whiteSpace:"pre-line"},
  workoutCard:{background:"#13131A",borderRadius:16,padding:"14px 16px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"},workoutCardInfo:{flex:1},workoutCardName:{color:"#fff",fontSize:16,fontWeight:700,marginBottom:2},workoutCardMeta:{color:"#666",fontSize:12,marginBottom:6},blockDots:{display:"flex",gap:4},blockDot:{width:6,height:6,borderRadius:3},
  deleteBtn:{background:"none",border:"none",color:"#444",cursor:"pointer",padding:6,display:"flex"},
  editBtn:{background:"none",border:"1px solid #333",borderRadius:8,padding:"6px 8px",color:"#888",cursor:"pointer",display:"flex"},
  startBtn:{background:"#FF6B35",border:"none",borderRadius:14,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"},
  timerHeader:{padding:"max(52px,env(safe-area-inset-top,52px)) 16px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"},timerTitle:{color:"#fff",fontSize:16,fontWeight:700,letterSpacing:1,flex:1,textAlign:"center"},
  backBtn:{background:"none",border:"none",color:"#888",cursor:"pointer",padding:4,display:"flex"},blockBar:{display:"flex",gap:3,padding:"0 16px 12px",height:10},blockBarItem:{height:4,borderRadius:2,minWidth:4,transition:"background 0.3s"},
  timerCircleWrapper:{position:"relative",width:260,height:260,margin:"0 auto 16px",display:"flex",alignItems:"center",justifyContent:"center"},timerOverlay:{position:"absolute",top:0,left:0,right:0,bottom:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},timerLabel:{fontSize:11,fontWeight:700,letterSpacing:3,marginBottom:4},timerDisplay:{color:"#fff",fontSize:56,fontWeight:900,letterSpacing:-2,lineHeight:1},timerSub:{color:"#555",fontSize:14,marginTop:8},
  timerControls:{display:"flex",alignItems:"center",justifyContent:"center",gap:24,marginBottom:16},controlBtn:{background:"#1E1E2E",border:"none",borderRadius:16,width:52,height:52,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff"},playBtn:{border:"none",borderRadius:28,width:72,height:72,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"background 0.3s"},
  addBlockRow:{display:"flex",gap:8,padding:"0 16px 12px",justifyContent:"center"},addBlockBtn:{background:"#0E0E16",border:"1px solid",borderRadius:10,padding:"8px 12px",cursor:"pointer",display:"flex",alignItems:"center"},blockList:{padding:"0 16px",maxHeight:"40vh",overflowY:"auto",WebkitOverflowScrolling:"touch"},blockListItem:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 10px",marginBottom:4,background:"#13131A",borderRadius:8,borderLeft:"3px solid"},
  screenHeader:{padding:"max(52px,env(safe-area-inset-top,52px)) 16px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"},screenHeaderTitle:{color:"#fff",fontSize:15,fontWeight:700,letterSpacing:2,flex:1,textAlign:"center"},
  prEmpty:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",textAlign:"center"},prGroup:{marginBottom:24},prGroupTitle:{color:"#FF6B35",fontSize:12,fontWeight:700,letterSpacing:2,marginBottom:8},prRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",background:"#13131A",borderRadius:12,marginBottom:6},prRowLeft:{flex:1},prRowValue:{color:"#fff",fontSize:22,fontWeight:800},prRowUnit:{fontSize:13,fontWeight:400,color:"#888"},prRowNotes:{color:"#555",fontSize:12,marginTop:2},prRowDate:{color:"#555",fontSize:12},
  builderMeta:{display:"flex",justifyContent:"space-between",marginBottom:14,fontSize:13},builderBlock:{display:"flex",alignItems:"center",gap:8,background:"#13131A",borderRadius:12,padding:"12px 10px",marginBottom:8},builderBlockAccent:{width:4,height:40,borderRadius:2,flexShrink:0},builderBlockBody:{flex:1},builderBlockType:{fontSize:10,fontWeight:700,letterSpacing:1,color:"#666"},builderBlockLabel:{fontSize:14,color:"#fff",fontWeight:600,marginTop:2},builderBlockTime:{color:"#FF6B35",fontSize:14,fontWeight:700,marginRight:4},arrowBtn:{background:"none",border:"none",color:"#555",cursor:"pointer",fontSize:10,padding:1,lineHeight:1},addBlockGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12},addTypeBtn:{background:"#0E0E16",border:"1px solid",borderRadius:12,padding:"12px",cursor:"pointer",textAlign:"center"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"flex-end",zIndex:100},modal:{background:"#13131A",borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",width:"100%",maxWidth:430,margin:"0 auto",maxHeight:"85vh",overflowY:"auto"},modalHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20},modalTitle:{color:"#fff",fontSize:18,fontWeight:700},modalClose:{background:"none",border:"none",color:"#666",cursor:"pointer",display:"flex"},
  input:{width:"100%",background:"#0A0A0F",border:"1px solid #2A2A3A",borderRadius:12,padding:"12px 14px",color:"#fff",fontSize:15,marginBottom:12,boxSizing:"border-box",outline:"none"},unitRow:{display:"flex",flexWrap:"wrap",gap:4},unitBtn:{border:"none",borderRadius:8,padding:"8px 8px",cursor:"pointer",fontSize:11,fontWeight:700,minWidth:36},submitBtn:{width:"100%",background:"#FF6B35",border:"none",borderRadius:14,padding:"16px",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",letterSpacing:1},typeBtn:{flex:1,border:"none",borderRadius:8,padding:"8px 4px",cursor:"pointer",fontWeight:700},durationBtn:{background:"#1E1E2E",border:"none",borderRadius:8,padding:"8px 10px",color:"#FF6B35",fontSize:12,fontWeight:700,cursor:"pointer"},
  scanCta:{display:"flex",alignItems:"center",gap:12,margin:"0 16px 20px",background:"linear-gradient(135deg,#1A1A2E 0%,#16213E 100%)",border:"1px solid #A29BFE44",borderRadius:18,padding:"16px 18px",cursor:"pointer",color:"#888",width:"calc(100% - 32px)",textAlign:"left"},scanIdle:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"70vh",padding:"0 32px",textAlign:"center"},scanIllustration:{fontSize:72,marginBottom:20},
  scanLoading:{display:"flex",flexDirection:"column",alignItems:"center",minHeight:"70vh"},scanPreviewImg:{width:"100%",maxHeight:220,objectFit:"cover",borderRadius:"0 0 20px 20px",marginBottom:0},scanSpinnerWrap:{display:"flex",flexDirection:"column",alignItems:"center",marginTop:32},scanSpinner:{width:48,height:48,border:"4px solid #1E1E2E",borderTop:"4px solid #A29BFE",borderRadius:"50%",animation:"spin 0.9s linear infinite"},scanResultHeader:{display:"flex",gap:12,alignItems:"flex-start",marginBottom:16,marginTop:4},scanThumb:{width:72,height:72,objectFit:"cover",borderRadius:12,flexShrink:0},scanBlock:{display:"flex",alignItems:"center",gap:8,background:"#13131A",borderRadius:12,padding:"12px 10px",marginBottom:8},scanActions:{position:"fixed",bottom:0,left:0,right:0,display:"flex",gap:10,padding:"12px 16px 32px",background:"#0A0A0F",borderTop:"1px solid #1E1E2E",maxWidth:430,margin:"0 auto"},
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
