type Callbacks = {
  onStart: () => void;
  onEnd: () => void;
  onFail: () => void;
};

const plain = (text: string) => text.replaceAll("`", "");

// Läser upp meningarna en i taget (Chrome klipper långa yttranden) och anropar onEnd efter den sista.
// Returnerar en funktion som avbryter uppläsningen utan att anropa några callbacks.
export function speak(sentences: string[], cb: Callbacks): () => void {
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
  // Webbläsaren kan blockera tal innan användaren har interagerat med sidan.
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
