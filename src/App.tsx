import { useEffect, useReducer, useRef, useState } from "react";
import { SECTIONS } from "./sections";
import { useSettings } from "./settings";
import { speak } from "./speech";
import { loadState, nextSection, reducer, saveState } from "./state";

// Gör om `backticks` till <code>.
function Sentence({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}

const ICONS = {
  speaker: (
    <path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7m2.8-10.3a9 9 0 0 1 0 13.6" />
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  sun: (
    <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0-14v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  ),
};

function Switch({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: keyof typeof ICONS;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch" onClick={() => onChange(!checked)}>
      <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
        {ICONS[icon]}
      </svg>
      <span className="label">{label}</span>
      <span className="track">
        <span className="knob" />
      </span>
    </button>
  );
}

export default function App() {
  const [st, dispatch] = useReducer(reducer, undefined, loadState);
  const S = SECTIONS[st.sec];
  const total = S.sentences.length;
  const isDone = st.phase === "done";
  const shown = isDone ? total : st.n;
  const next = nextSection(st);
  const [speech, setSpeech] = useState<"waiting" | "speaking" | "blocked" | "stopped">("waiting");
  const [playToken, setPlayToken] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [settings, updateSettings] = useSettings();
  const autoRead = settings.autoRead;
  const stopAuto = useRef<(() => void) | null>(null);
  const stopClick = useRef<(() => void) | null>(null);

  useEffect(() => saveState(st), [st]);

  // Läs upp den nya meningen en gång när den visas, och dölj texten när uppläsningen är klar.
  useEffect(() => {
    if (st.phase !== "show" || !autoRead) return;
    const stop = speak([SECTIONS[st.sec].sentences[st.n - 1]], {
      onStart: () => setSpeech("speaking"),
      onEnd: () => dispatch({ type: "hide" }),
      onFail: () => setSpeech("blocked"),
    });
    stopAuto.current = stop;
    return () => {
      stop();
      setSpeech("waiting");
    };
  }, [st.phase, st.sec, st.n, playToken, autoRead]);

  // Avbryt en klickad mening och ta bort markeringen när man byter läge eller mening.
  useEffect(
    () => () => {
      stopClick.current?.();
      setSelected(null);
    },
    [st.phase, st.sec, st.n, playToken],
  );

  // Markera en mening och spela upp den. Avbryter den automatiska uppläsningen.
  function selectSentence(i: number) {
    setSelected(i);
    stopAuto.current?.();
    stopClick.current?.();
    if (st.phase === "show") setSpeech("stopped");
    stopClick.current = speak([S.sentences[i]], { onStart: () => {}, onEnd: () => {}, onFail: () => {} });
  }

  // Den klickade meningen är markerad, annars den nya.
  const highlighted = selected ?? (shown > 1 ? shown - 1 : null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as Element | null;
      if (target?.closest?.("button, [role=button]") && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (st.phase === "show") {
          if (autoRead && speech === "blocked") setPlayToken((t) => t + 1);
          else dispatch({ type: "hide" });
        } else if (st.phase === "hidden") dispatch({ type: "check" });
        else if (st.phase === "check") dispatch({ type: "retry" });
        else if (next > -1) dispatch({ type: "go", sec: next });
      } else if ((e.key === "k" || e.key === "K") && st.phase === "check") {
        dispatch({ type: "yes" });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [st.phase, next, speech, autoRead]);

  return (
    <div className="wrap">
      <header>
        <div className="topbar">
          <span className="eyebrow">Kubernetes · Block 1 · prov onsdag</span>
          <div className="switches">
            <Switch
              label="Läs upp automatiskt"
              icon="speaker"
              checked={autoRead}
              onChange={(v) => updateSettings({ autoRead: v })}
            />
            <Switch
              label="Mörkt läge"
              icon={settings.theme === "dark" ? "moon" : "sun"}
              checked={settings.theme === "dark"}
              onChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
            />
          </div>
        </div>
        <h1>Lär dig mening för mening</h1>
        <p className="intro">
          Lyssna, repetera i huvudet och kontrollera. Klarar du det läggs nästa mening till. Annars läses texten upp igen.
        </p>
      </header>

      <nav className="chips" aria-label="Rubriker">
        {SECTIONS.map((x, i) => {
          const cls = st.done.includes(i) ? "done" : st.started.includes(i) ? "started" : "";
          return (
            <button
              key={x.title}
              type="button"
              className={`chip ${cls}`}
              aria-current={i === st.sec}
              onClick={() => dispatch({ type: "go", sec: i })}
            >
              <span className="dot" />
              {x.title}
            </button>
          );
        })}
      </nav>

      <section className="card" aria-live="polite">
        <div className="cardhead">
          <h2>{S.title}</h2>
          <span className="count">
            {isDone ? `${total} av ${total} meningar` : `Mening ${st.n} av ${total}`}
          </span>
        </div>
        <div className="bar">
          <span style={{ width: `${((isDone ? total : st.n - 1) / total) * 100}%` }} />
        </div>

        <div className="stage">
          {(st.phase === "show" || st.phase === "check") && (
            <p className="text">
              {S.sentences.slice(0, shown).map((x, i) => (
                <span key={i}>
                  <span
                    role="button"
                    tabIndex={0}
                    title="Spela upp meningen"
                    className={`s ${i === highlighted ? "newest" : ""}`}
                    onClick={() => selectSentence(i)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        selectSentence(i);
                      }
                    }}
                  >
                    <Sentence text={x} />
                  </span>{" "}
                </span>
              ))}
            </p>
          )}
          {st.phase === "hidden" && (
            <div className="black">
              <b>Repetera i huvudet</b>
              <small>{shown === 1 ? "1 mening" : `${shown} meningar`} från början</small>
            </div>
          )}
          {isDone && (
            <div className="doneBox">
              <b>Klar med {S.title}</b>
              <span>Du kan alla {total} meningar i rad.</span>
            </div>
          )}
        </div>

        <div className="actions">
          {st.phase === "show" &&
            (!autoRead ? (
              <button type="button" className="btn primary" onClick={() => dispatch({ type: "hide" })}>
                Dölj och repetera<kbd>␣</kbd>
              </button>
            ) : speech === "blocked" ? (
              <>
                <button type="button" className="btn primary" onClick={() => setPlayToken((t) => t + 1)}>
                  Läs upp<kbd>␣</kbd>
                </button>
                <button type="button" className="btn" onClick={() => dispatch({ type: "hide" })}>
                  Dölj utan uppläsning
                </button>
              </>
            ) : (
              <>
                <span className="status">
                  {speech === "speaking"
                    ? "Läser upp…"
                    : speech === "stopped"
                      ? "Tryck på en mening för att höra den"
                      : "Startar uppläsning…"}
                </span>
                <button type="button" className="btn" onClick={() => dispatch({ type: "hide" })}>
                  Dölj nu<kbd>␣</kbd>
                </button>
              </>
            ))}
          {st.phase === "hidden" && (
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "check" })}>
              Kontrollera svar<kbd>␣</kbd>
            </button>
          )}
          {st.phase === "check" && (
            <>
              <button type="button" className="btn yes" onClick={() => dispatch({ type: "yes" })}>
                Klarade det<kbd>K</kbd>
              </button>
              <button type="button" className="btn no" onClick={() => dispatch({ type: "retry" })}>
                Försök igen<kbd>␣</kbd>
              </button>
            </>
          )}
          {isDone && (
            <>
              {next > -1 ? (
                <button type="button" className="btn primary" onClick={() => dispatch({ type: "go", sec: next })}>
                  Nästa: {SECTIONS[next].title}
                  <kbd>␣</kbd>
                </button>
              ) : (
                <span className="btn" style={{ cursor: "default" }}>
                  Hela block 1 klart!
                </span>
              )}
              <button type="button" className="btn" onClick={() => dispatch({ type: "again" })}>
                Öva igen
              </button>
            </>
          )}
        </div>
      </section>

      <div className="foot">
        <span>Mellanslag = kontrollera / försök igen · K = klarade</span>
        <button className="link" type="button" onClick={() => dispatch({ type: "reset" })}>
          Börja om allt
        </button>
      </div>
    </div>
  );
}
