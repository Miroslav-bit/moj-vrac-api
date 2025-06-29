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
Your task is to check whether the user's sentence (written in one of the 8 supported languages) is a properly formulated question that:

1. Is an interrogative sentence (asks a question),
2. Refers to the future (something that has not happened yet),
3. Can be answered with 'YES' or 'NO'.

Respond with a single word only:
- „VALIDNO“ if all three conditions are met,
- „NEVALIDNO“ otherwise.

Korisničko pitanje: "${pitanje}"`;

  const odgovor = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Return only one word: VALIDNO or NEVALIDNO."
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
  ru: { da: "ДА", ne: "НЕТ", verovatnoca: "вероятность" },
  pl: { da: "TAK", ne: "NIE", verovatnoca: "prawdopodobieństwo" },
  uk: { da: "ТАК", ne: "НІ", verovatnoca: "ймовірність" }
};

app.post("/api/v1/da-li-ce-se-desiti", async (req, res) => {
  const pitanje = req.body.pitanje;
  const jezik = req.body.jezik || "en";

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

const pitanjeTekst = pitanje.split("Pitanje:").pop().trim();
const validno = await proveriValidnostPitanja(pitanjeTekst);
  if (!validno) {
    return res.status(400).json({
      poruka: "The question is not properly formulated. Please ask a question that refers to the future and can be answered with YES or NO."
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
          content: "Return only the probability as a decimal number between 0 and 1. Do not add anything else."
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
      return res.status(500).send("Invalid model response.");
    }

    const procenat = Math.round(verovatnoca * 100);
    const odgovorDaNe = verovatnoca > 0.5
      ? (prevodiOdgovora[jezik]?.da || "DA")
      : (prevodiOdgovora[jezik]?.ne || "NE");
    const recVerovatnoca = prevodiOdgovora[jezik]?.verovatnoca || "verovatnoća";

    res.json({ odgovor: `${odgovorDaNe}, ${recVerovatnoca} ${procenat}%` });

  } catch (error) {
    console.error("❌Error in OpenAI call:", error);
    res.status(500).send("Request processing error.");
  }
});

app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
