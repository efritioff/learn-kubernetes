import { useEffect, useReducer } from "react";
import { SECTIONS } from "./sections";
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

  useEffect(() => saveState(st), [st]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as Element | null;
      if (target?.closest?.("button") && (e.key === " " || e.key === "Enter")) return;
      if (e.key === " ") {
        e.preventDefault();
        if (st.phase === "show") dispatch({ type: "hide" });
        else if (st.phase === "hidden") dispatch({ type: "yes" });
        else if (next > -1) dispatch({ type: "go", sec: next });
      } else if ((e.key === "n" || e.key === "N") && st.phase === "hidden") {
        dispatch({ type: "no" });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [st.phase, next]);

  return (
    <div className="wrap">
      <header>
        <span className="eyebrow">Kubernetes · Block 1 · prov onsdag</span>
        <h1>Lär dig mening för mening</h1>
        <p className="intro">
          Läs, dölj och repetera i huvudet. Klarar du det läggs nästa mening till. Klarar du det inte får du läsa igen.
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
          {st.phase === "show" && (
            <p className="text">
              {S.sentences.slice(0, shown).map((x, i) => (
                <span key={i}>
                  <span className={`s ${i === shown - 1 && shown > 1 ? "newest" : ""}`}>
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
          {st.phase === "show" && (
            <button type="button" className="btn primary" onClick={() => dispatch({ type: "hide" })}>
              Dölj och repetera<kbd>␣</kbd>
            </button>
          )}
          {st.phase === "hidden" && (
            <>
              <button type="button" className="btn yes" onClick={() => dispatch({ type: "yes" })}>
                Klarade det<kbd>␣</kbd>
              </button>
              <button type="button" className="btn no" onClick={() => dispatch({ type: "no" })}>
                Klarade inte<kbd>N</kbd>
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
        <span>Mellanslag = dölj / ja · N = nej</span>
        <button className="link" type="button" onClick={() => dispatch({ type: "reset" })}>
          Börja om allt
        </button>
      </div>
    </div>
  );
}
