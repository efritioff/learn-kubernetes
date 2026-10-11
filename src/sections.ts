export type Section = { title: string; sentences: string[] };

// Text inom `backticks` visas som kod.
export const SECTIONS: Section[] = [
  {
    title: "Vad är Kubernetes?",
    sentences: [
      "Kubernetes kör och övervakar containrar på en eller flera datorer.",
      "Man beskriver vad som ska köra, och Kubernetes ser till att det fortsätter köra, även om något kraschar.",
      "PM2 och Docker Compose gör ungefär samma sak, men bara på en dator.",
      "Kubernetes får många datorer att fungera som en enda.",
      "Det sköter också nätverk, lastbalansering, uppdateringar utan nedtid och skalning.",
      "Därför kallas det ett verktyg för infrastruktur.",
      "Förkortas k8s.",
    ],
  },
  {
    title: "Poddar",
    sentences: [
      "En podd är den minsta enheten i Kubernetes.",
      "Den är ett skal runt en container, där din image kör.",
      "Ibland finns en extra container bredvid, en sidecar, som till exempel samlar loggar.",
      "Containrar i samma podd delar nätverk.",
      "Poddar är kortlivade och kan ersättas när som helst.",
      "En ny podd får ny adress, så man anropar inte poddar direkt utan via en Service.",
    ],
  },
  {
    title: "Noder",
    sentences: [
      "En nod är en dator, fysisk eller virtuell, som kör poddar.",
      "Den kan köra många poddar så länge minne och processorkraft räcker.",
      "Fler noder ger mer kapacitet, och om en nod går sönder flyttas poddarna till de andra.",
      "I molnet kan nya noder läggas till automatiskt.",
      "I en egen serverhall (on premise) gör man det för hand.",
    ],
  },
  {
    title: "Kontrollplanet",
    sentences: [
      "Kontrollplanet är klustrets hjärna och har koll på alla noder och poddar.",
      "Det har fyra delar.",
      "API-servern tar emot kommandon.",
      "etcd är en databas som sparar klustrets tillstånd.",
      "Schemaläggaren väljer vilken nod en ny podd hamnar på.",
      "Kontrollerna ser till att allt stämmer.",
      "När du kör kubectl pratar du med kontrollplanet, aldrig direkt med en nod.",
    ],
  },
  {
    title: "Önskat läge och faktiskt läge",
    sentences: [
      "Kubernetes är deklarativt.",
      "Man ger inte order steg för steg, utan beskriver hur det ska se ut, till exempel ”tre poddar med backend”.",
      "Det kallas önskat läge.",
      "Det som faktiskt kör kallas faktiskt läge.",
      "Kontrollplanet jämför dem hela tiden och rättar till skillnader.",
      "Kraschar en podd startas en ny.",
      "Det fungerar som en termostat: du ställer in 21 grader, resten sköts automatiskt.",
      "Därför kan klustret laga sig självt.",
    ],
  },
  {
    title: "Från YAML till körande poddar",
    sentences: [
      "Det önskade läget skrivs i YAML-filer, med vilken image som ska köra och hur många kopior.",
      "Filerna skickas med `kubectl apply -f fil.yaml`.",
      "Sedan skapar kontrollplanet poddarna, och schemaläggaren väljer vilken nod de hamnar på utifrån ledig plats.",
      "Man kan styra valet, till exempel till noder med grafikkort, men det behövs sällan.",
    ],
  },
  {
    title: "kubectl",
    sentences: [
      "kubectl är kommandoradsverktyget för Kubernetes.",
      "Det fungerar likadant oavsett var klustret kör, och det pratar med kontrollplanet.",
      "Vilket kluster kubectl pratar med står i filen kubeconfig.",
      "Man byter kluster med `kubectl config use-context`.",
      "`kubectl apply` skapar eller uppdaterar det som står i filerna.",
      "`kubectl get pods` listar poddar.",
      "`kubectl describe` visar detaljer och händelser.",
      "`kubectl logs` visar loggarna från en podd.",
      "`kubectl exec` öppnar ett skal inuti en podd.",
      "`kubectl delete` tar bort det som står i filerna.",
      "Vid felsökning börjar man med get, describe och logs.",
    ],
  },
];
