
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

const prevodiOdgovora = {
  sr: { da: "DA", ne: "NE", verovatnoca: "verovatnoća" },
  en: { da: "YES", ne: "NO", verovatnoca: "probability" },
  es: { da: "SÍ", ne: "NO", verovatnoca: "probabilidad" },
  fr: { da: "OUI", ne: "NON", verovatnoca: "probabilité" },
  de: { da: "JA", ne: "NEIN", verovatnoca: "Wahrscheinlichkeit" },
  it: { da: "SÌ", ne: "NO", verovatnoca: "probabilità" },
  pt: { da: "SIM", ne: "NÃO", verovatnoca: "probabilidade" },
  ru: { da: "ДА", ne: "НЕТ", verovatnoca: "вероятность" },
};

app.post("/api/v1/da-li-ce-se-desiti", async (req, res) => {
  const jezik = req.body.lang || "sr";
  const pitanje = req.body.pitanje;

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

  try {
    const systemPrompt = {
      role: "system",
      content: `Na osnovu analize svih dostupnih podataka, statistike, logike i iskustva, proceni verovatnoću da će se ishod iz pitanja ostvariti. Odgovaraj isključivo rečju ${
        jezik === 'en' ? 'YES' :
        jezik === 'es' ? 'SÍ' :
        jezik === 'fr' ? 'OUI' :
        jezik === 'de' ? 'JA' :
        jezik === 'it' ? 'SÌ' :
        jezik === 'pt' ? 'SIM' :
        jezik === 'ru' ? 'ДА' : 'DA'
      } ili ${
        jezik === 'en' ? 'NO' :
        jezik === 'es' ? 'NO' :
        jezik === 'fr' ? 'NON' :
        jezik === 'de' ? 'NEIN' :
        jezik === 'it' ? 'NO' :
        jezik === 'pt' ? 'NÃO' :
        jezik === 'ru' ? 'НЕТ' : 'NE'
      }, praćenom procentom verovatnoće (npr. "YES 73%").`
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        systemPrompt,
        {
          role: "user",
          content: pitanje
        }
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    const raw = completion.choices[0].message.content.trim();
    const matches = raw.match(/^([^\d\s]+)\s+(\d{1,3})%$/);

    if (!matches) {
      return res.status(500).send("Nevalidan format odgovora.");
    }

    const procenat = parseInt(matches[2]);
    const odgovorDaNe = procenat > 50
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
  console.log(`🚀 Server aktivan na portu ${port}`);
});
