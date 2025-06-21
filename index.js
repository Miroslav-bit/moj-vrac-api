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

app.post("/api/v1/da-li-ce-se-desiti", async (req, res) => {
  const pitanje = req.body.pitanje;
  const lang = req.body.lang || "sr";

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

  const dozvoljeniJezici = ["sr", "en", "de", "fr", "es", "it", "pt", "ru"];
  const jezik = dozvoljeniJezici.includes(lang) ? lang : "sr";

  try {
    const prompt = `
VAŽNO: Odgovori tačno i isključivo na jeziku "${jezik}". Ne objašnjavaj ništa dodatno. Poštuj tačan format.

Primer:
Odgovor: DA
Verovatnoća: 72%

Na osnovu analize svih poznatih podataka, statistike, logike i iskustva, odgovori na sledeće pitanje u gornjem formatu:

"${pitanje}"
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const odgovor = completion.choices[0].message.content.trim();
    res.json({ odgovor });
  } catch (error) {
    console.error("❌ Greška u OpenAI pozivu:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      res.status(500).send("Greška u OpenAI odgovoru: " + JSON.stringify(error.response.data));
    } else {
      console.error("Error:", error.message || error);
      res.status(500).send("Greška u obradi zahteva: " + (error.message || error));
    }
  }
});

app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
