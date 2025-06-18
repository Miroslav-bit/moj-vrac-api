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

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

  try {
    const prompt = `Proceni istinitost sledećeg pitanja koristeći sve dostupne informacije, statistiku, logiku i verovatnoće. 
Odgovori u sledećem formatu: DA ili NE, zatim reč "verovatnoća", i na kraju broj u procentima (bez dodatnog objašnjenja). 

Pitanje: "${pitanje}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "Ti si analitički asistent koji daje precizne i logičke procene u formatu: DA ili NE, reč 'verovatnoća', i broj u procentima. Ne daješ nikakva dodatna objašnjenja.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const odgovor = completion.choices[0].message.content.trim();
    res.json({ odgovor });

  } catch (error) {
    console.error("❌ Greška u OpenAI pozivu:", error);
    res.status(500).send("Greška u obradi zahteva.");
  }
});

app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
