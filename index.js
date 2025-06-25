const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Nema postavljenog OpenAI API ključa.");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function proveriValidnostPitanja(pitanje) {
  const promptValidacija = `
Tvoj zadatak je da proveriš da li je korisnička rečenica (napisana na jednom od 8 podržanih jezika) ispravno formulisano pitanje koje:

1. Jeste upitna rečenica (postavlja pitanje),
2. Odnosi se na budućnost (odnosi se na nešto što se još nije dogodilo),
3. Može se odgovoriti sa „DA“ ili „NE“.

Odgovori isključivo jednom rečju:
- „VALIDNO“ ako su sva tri uslova ispunjena,
- „NEVALIDNO“ u suprotnom.

Korisničko pitanje: "${pitanje}"`;

  const odgovor = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Vrati samo jednu reč: VALIDNO ili NEVALIDNO."
      },
      {
        role: "user",
        content: promptValidacija,
      },
    ],
    temperature: 0.7,
    max_tokens: 100,
  });

  const rezultat = odgovor.choices[0].message.content.trim().toUpperCase();
  return rezultat === "VALIDNO";
}

const prevodiOdgovora = {
  sr: { da: "DA", ne: "NE", verovatnoca: "verovatnoća" },
  en: { da: "YES", ne: "NO", verovatnoca: "probability" },
  es: { da: "SÍ", ne: "NO", verovatnoca: "probabilidad" },
  fr: { da: "OUI", ne: "NON", verovatnoca: "probabilité" },
  de: { da: "JA", ne: "NEIN", verovatnoca: "Wahrscheinlichkeit" },
  pt: { da: "SIM", ne: "NÃO", verovatnoca: "probabilidade" },
  it: { da: "SÌ", ne: "NO", verovatnoca: "probabilità" },
  ru: { da: "ДА", ne: "НЕТ", verovatnoca: "вероятность" }
};

app.post("/api/v1/da-li-ce-se-desiti", async (req, res) => {
  const pitanje = req.body.pitanje;
  const jezik = req.body.jezik || "en";

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

  const validno = await proveriValidnostPitanja(pitanje);
  if (!validno) {
    return res.status(400).json({
      poruka: "Pitanje nije pravilno formulisano. Postavite pitanje koje se odnosi na budućnost i na koje se može odgovoriti sa DA ili NE."
    });
  }

  try {
    const prompt = `You are a specialized AI system designed to estimate the likelihood of future events. Your task is to calculate the probability that a described event will happen, using available user input and your internal knowledge base.

Follow these principles in every response:

1. Base your assessment on known facts, natural laws, logic, and verifiable statistical data from your training. Do not guess, invent, or make unfounded assumptions.

2. If the user provides insufficient details, use demographic averages, global statistics, and the most likely scenario for an average individual or situation.

3. If the user provides specific data (e.g. age, location, health status, occupation, environment), use it to narrow the estimate and increase accuracy.

4. Interpret all questions relative to the current date (assume you know today's date). Determine whether the question concerns the past, present, or future. Analyze only future events.

5. Be consistent. If the same question is asked multiple times with identical input, the result must be equal or very similar. Do not change your estimate without a logical reason.

6. Never use 0% or 100% unless the event is physically, logically, or temporally impossible (e.g. "Will the Earth become a cube tomorrow?" → 0%).

7. Do not rely on intuition, emotion, vague language, or speculative reasoning. All estimates must be knowledge-based and logically derived.

8. When risk factors are involved, rely on relevant fields of knowledge. Draw from the following areas (but not limited to): physics, biology, medicine, epidemiology, statistics, economics, meteorology, psychology, sociology, demography, criminology, law, politics, environmental science, AI, engineering, astronomy, chemistry, agriculture, history, anthropology, veterinary science, public health, transportation, education, security, bioengineering, military analysis, philosophy, urban planning, archaeology, and all other applicable domains you were trained on.

9. Use the appropriate domain based on the context: physics for physical phenomena, sociology for human behavior, medicine for health questions, etc.

10. Act as a rational analyst. Deliver the most informed and consistent estimate based on your training. Avoid wild fluctuations. If uncertain, choose the probability best supported by your internal data.

Your response must be a single **decimal number between 0 and 1** that represents the likelihood that the event will occur. Output **nothing else**.

    Pitanje: "${pitanje}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Vrati samo verovatnoću kao decimalni broj između 0 i 1. Ništa drugo ne dodaj."
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const raw = completion.choices[0].message.content.trim();
    const verovatnoca = parseFloat(raw);

    if (isNaN(verovatnoca)) {
      return res.status(500).send("Nevalidan odgovor modela.");
    }

    const procenat = Math.round(verovatnoca * 100);
    const odgovorDaNe = verovatnoca > 0.5
      ? (prevodiOdgovora[jezik]?.da || "DA")
      : (prevodiOdgovora[jezik]?.ne || "NE");
    const recVerovatnoca = prevodiOdgovora[jezik]?.verovatnoca || "verovatnoća";

    res.json({ odgovor: `${odgovorDaNe}, ${recVerovatnoca} ${procenat}%` });

  } catch (error) {
    console.error("❌ Greška u OpenAI pozivu:", error);
    res.status(500).send("Greška u obradi zahteva.");
  }
});

app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
