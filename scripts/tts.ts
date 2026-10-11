// Skapar MP3-filer för alla meningar med ElevenLabs.
// Kör: npm run tts   (läser ELEVENLABS_API_KEY och ELEVENLABS_VOICE_ID från .env)
// Redan skapade filer hoppas över, och filer för borttagna meningar raderas.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { SECTIONS } from "../src/sections.ts";

const API = "https://api.elevenlabs.io/v1";
const KEY = process.env.ELEVENLABS_API_KEY;
const VOICE = process.env.ELEVENLABS_VOICE_ID;
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const AUDIO_DIR = "public/audio";
const MANIFEST = "src/audio-manifest.json";

const plain = (text: string) => text.replaceAll("`", "");

if (!KEY) {
  console.error("Saknar ELEVENLABS_API_KEY. Kopiera .env.example till .env och fyll i din nyckel.");
  process.exit(1);
}

if (!VOICE) {
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": KEY } });
  if (!res.ok) {
    console.error(`Kunde inte hämta röster: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const { voices } = (await res.json()) as {
    voices: { voice_id: string; name: string; labels?: Record<string, string> }[];
  };
  console.log("Sätt ELEVENLABS_VOICE_ID i .env till en av dessa röster:\n");
  for (const v of voices) {
    const labels = Object.values(v.labels ?? {}).join(", ");
    console.log(`  ${v.voice_id}  ${v.name}${labels ? `  (${labels})` : ""}`);
  }
  console.log("\nFler röster, även svenska, finns i Voice Library på elevenlabs.io. Lägg till en där och kör igen.");
  process.exit(0);
}

mkdirSync(AUDIO_DIR, { recursive: true });
const manifest: Record<string, string> = {};
let created = 0;

for (const section of SECTIONS) {
  const texts = section.sentences.map(plain);
  for (const [i, text] of texts.entries()) {
    const hash = createHash("sha1").update(`${MODEL}|${VOICE}|${text}`).digest("hex").slice(0, 16);
    const file = `${hash}.mp3`;
    manifest[text] = `audio/${file}`;
    if (existsSync(`${AUDIO_DIR}/${file}`)) continue;

    process.stdout.write(`Skapar: ${text}\n`);
    const res = await fetch(`${API}/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        // Grannmeningarna ger jämnare tonfall när meningarna spelas efter varandra.
        previous_text: texts[i - 1],
        next_text: texts[i + 1],
      }),
    });
    if (!res.ok) {
      console.error(`Misslyckades (${res.status}): ${await res.text()}`);
      process.exit(1);
    }
    writeFileSync(`${AUDIO_DIR}/${file}`, Buffer.from(await res.arrayBuffer()));
    created++;
  }
}

const used = new Set(Object.values(manifest).map((p) => p.slice("audio/".length)));
let removed = 0;
for (const f of readdirSync(AUDIO_DIR)) {
  if (f.endsWith(".mp3") && !used.has(f)) {
    rmSync(`${AUDIO_DIR}/${f}`);
    removed++;
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`Klart: ${created} nya, ${Object.keys(manifest).length - created} fanns redan, ${removed} borttagna.`);
