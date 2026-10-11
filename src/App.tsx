import { useEffect, useReducer, useRef, useState } from "react";
import { SECTIONS } from "./sections";
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

export default function App() {
  const [st, dispatch] = useReducer(reducer, undefined, loadState);
  const S = SECTIONS[st.sec];
  const total = S.sentences.length;
  const isDone = st.phase === "done";
  const shown = isDone ? total : st.n;
  const next = nextSection(st);
  const [speech, setSpeech] = useState<"waiting" | "speaking" | "blocked" | "stopped">("waiting");
  const [playToken, setPlayToken] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const stopAuto = useRef<(() => void) | null>(null);
  const stopClick = useRef<(() => void) | null>(null);

  useEffect(() => saveState(st), [st]);

  // Läs upp den nya meningen en gång när den visas, och dölj texten när uppläsningen är klar.
  useEffect(() => {
    if (st.phase !== "show") return;
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
  }, [st.phase, st.sec, st.n, playToken]);

  // Avbryt en klickad mening när man byter läge eller mening.
  useEffect(
    () => () => {
      stopClick.current?.();
      setPlaying(null);
    },
    [st.phase, st.sec, st.n, playToken],
  );

  // Spela upp en enda mening och markera den. Avbryter den automatiska uppläsningen.
  function playSentence(i: number) {
    stopAuto.current?.();
    stopClick.current?.();
    if (st.phase === "show") setSpeech("stopped");
    setPlaying(i);
    stopClick.current = speak([S.sentences[i]], {
      onStart: () => {},
      onEnd: () => setPlaying(null),
      onFail: () => setPlaying(null),
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as Element | null;
      if (target?.closest?.("button, [role=button]") && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (st.phase === "show") {
          if (speech === "blocked") setPlayToken((t) => t + 1);
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
  }, [st.phase, next, speech]);

  return (
    <div className="wrap">
      <header>
        <span className="eyebrow">Kubernetes · Block 1 · prov onsdag</span>
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
                    className={`s ${i === playing ? "playing" : i === shown - 1 && shown > 1 ? "newest" : ""}`}
                    onClick={() => playSentence(i)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        playSentence(i);
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
            (speech === "blocked" ? (
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
