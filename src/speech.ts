import manifest from "./audio-manifest.json";

type Callbacks = {
  onStart: () => void;
  onEnd: () => void;
  onFail: () => void;
};

type Manifest = { voices: { id: string; name: string }[]; files: Record<string, Record<string, string>> };
const { voices, files: audioFiles }: Manifest = manifest;

export const VOICES = voices;
const plain = (text: string) => text.replaceAll("`", "");

// Läser upp meningarna i ordning och anropar onEnd efter den sista.
// Använder förinspelade filer (npm run tts) om alla finns, annars webbläsarens röst.
// Returnerar en funktion som avbryter uppläsningen utan att anropa några callbacks.
export function speak(sentences: string[], voice: string | undefined, cb: Callbacks): () => void {
  const voiceFiles = (voice && audioFiles[voice]) || {};
  const files = sentences.map((s) => voiceFiles[plain(s)]);
  if (files.length > 0 && files.every(Boolean)) return playFiles(files, cb);
  return speakSynth(sentences, cb);
}

function playFiles(files: string[], cb: Callbacks): () => void {
  let active = true;
  let started = false;
  let idx = 0;
  const audios = files.map((f) => {
    const a = new Audio(import.meta.env.BASE_URL + f);
    a.preload = "auto";
    return a;
  });

  const fail = () => active && cb.onFail();
  const playNext = () => {
    if (!active) return;
    if (idx >= audios.length) return cb.onEnd();
    const a = audios[idx++];
    a.onended = playNext;
    a.onerror = fail;
    a.play()
      .then(() => {
        if (active && !started) {
          started = true;
          cb.onStart();
        }
      })
      // Webbläsaren kan blockera ljud innan användaren har interagerat med sidan.
      .catch(fail);
  };
  playNext();

  return () => {
    active = false;
    audios.forEach((a) => a.pause());
  };
}

// Reserv: läser upp meningarna en i taget (Chrome klipper långa yttranden).
function speakSynth(sentences: string[], cb: Callbacks): () => void {
  const synth = window.speechSynthesis;
  let active = true;
  if (!synth || sentences.length === 0) {
    queueMicrotask(() => active && cb.onFail());
    return () => {
      active = false;
    };
  }

  const voice = synth.getVoices().find((v) => v.lang.replace("_", "-").toLowerCase().startsWith("sv"));
  let started = false;
  const startTimeout = setTimeout(() => active && !started && cb.onFail(), 2000);

  synth.cancel();
  sentences.forEach((s, i) => {
    const u = new SpeechSynthesisUtterance(plain(s));
    u.lang = "sv-SE";
    if (voice) u.voice = voice;
    if (i === 0) {
      u.onstart = () => {
        started = true;
        if (active) cb.onStart();
      };
    }
    if (i === sentences.length - 1) u.onend = () => active && cb.onEnd();
    u.onerror = () => active && cb.onFail();
    synth.speak(u);
  });

  return () => {
    active = false;
    clearTimeout(startTimeout);
    synth.cancel();
  };
}
