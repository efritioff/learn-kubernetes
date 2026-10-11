import { SECTIONS } from "./sections";

export type Phase = "show" | "hidden" | "check" | "done";

export type State = {
  sec: number;
  n: number;
  phase: Phase;
  done: number[];
  started: number[];
};

export type Action =
  | { type: "go"; sec: number }
  | { type: "hide" }
  | { type: "check" }
  | { type: "yes" }
  | { type: "retry" }
  | { type: "back" }
  | { type: "again" }
  | { type: "reset" };

const KEY = "k8s-block1-v1";

export const initialState: State = { sec: 0, n: 1, phase: "show", done: [], started: [] };

export function loadState(): State {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (saved && typeof saved.sec === "number" && SECTIONS[saved.sec]) {
      return { ...initialState, ...saved };
    }
  } catch {
    // ignorera trasig eller blockerad lagring
  }
  return initialState;
}

export function saveState(st: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch {
    // lagring kan vara blockerad
  }
}

const addUnique = (list: number[], x: number) => (list.includes(x) ? list : [...list, x]);

function go(st: State, sec: number): State {
  return { ...st, sec, n: 1, phase: st.done.includes(sec) ? "done" : "show" };
}

export function reducer(st: State, action: Action): State {
  switch (action.type) {
    case "go":
      return go(st, action.sec);
    case "hide":
      return { ...st, phase: "hidden", started: addUnique(st.started, st.sec) };
    case "check":
      return { ...st, phase: "check" };
    case "yes": {
      const total = SECTIONS[st.sec].sentences.length;
      const started = addUnique(st.started, st.sec);
      if (st.n >= total) return { ...st, started, phase: "done", done: addUnique(st.done, st.sec) };
      return { ...st, started, n: st.n + 1, phase: "show" };
    }
    case "retry":
      return { ...st, phase: "show" };
    case "back":
      if (st.phase === "done") {
        const total = SECTIONS[st.sec].sentences.length;
        return { ...st, n: total, phase: "show", done: st.done.filter((x) => x !== st.sec) };
      }
      return st.n > 1 ? { ...st, n: st.n - 1, phase: "show" } : st;
    case "again":
      return go({ ...st, done: st.done.filter((x) => x !== st.sec) }, st.sec);
    case "reset":
      return initialState;
  }
}

export function nextSection(st: State): number {
  return SECTIONS.findIndex((_, i) => i > st.sec && !st.done.includes(i));
}
