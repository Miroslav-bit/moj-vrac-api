const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Nema postavljenog OpenAI API ključa.");
  process.exit(1);
}

// Inicijalizacija OpenAI klijenta
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// API ruta
app.post("/api/v1/da-li-ce-se-desiti", async (req, res) => {
  const pitanje = req.body.pitanje;

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

  try {
    const prompt = `Na osnovu analize svih poznatih podataka, statistike, logike i iskustva, odgovori sa DA ili NE i proceni verovatnoću ostvarenja sledećeg pitanja: "${pitanje}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const odgovor = completion.choices[0].message.content.trim();
    res.json({ odgovor });
  } catch (error) {
    console.error("❌ Greška u OpenAI pozivu:", error);
    res.status(500).send("Greška u obradi zahteva.");
  }
});

// Pokretanje servera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server pokrenut na portu ${PORT}`);
});
