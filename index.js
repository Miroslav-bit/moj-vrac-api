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
    temperature: 0,
    max_tokens: 10,
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
    const prompt = `Na osnovu pitanja odgovori SAMO decimalnim brojem između 0 i 1 koji predstavlja verovatnoću da je odgovor DA. Bez objašnjenja. Bez propratnog teksta. Odgovori na jeziku na kom je pitanje postavljeno.

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
      temperature: 0.3,
      max_tokens: 10,
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


PACKAGE.JSON 

{
  "name": "vrac-backend",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "body-parser": "^1.20.2",
    "openai": "^4.0.0",
    "dotenv": "^16.4.5"
  }
}
