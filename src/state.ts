import { SECTIONS } from "./sections";

export type Phase = "show" | "hidden" | "done";

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
  | { type: "yes" }
  | { type: "no" }
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
    case "yes": {
      const total = SECTIONS[st.sec].sentences.length;
      if (st.n >= total) return { ...st, phase: "done", done: addUnique(st.done, st.sec) };
      return { ...st, n: st.n + 1, phase: "show" };
    }
    case "no":
      return { ...st, phase: "show" };
    case "again":
      return go({ ...st, done: st.done.filter((x) => x !== st.sec) }, st.sec);
    case "reset":
      return initialState;
  }
}

export function nextSection(st: State): number {
  return SECTIONS.findIndex((_, i) => i > st.sec && !st.done.includes(i));
}
