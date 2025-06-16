const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Configuration, OpenAIApi } = require("openai");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Provera da li postoji API ključ
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ Nema postavljenog OpenAI API ključa! Proveri varijable okruženja.");
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// API ruta
app.post("/api/v1/da-li-ce-se-desiti", async (req, res) => {
  const pitanje = req.body.pitanje;

  if (!pitanje || pitanje.trim() === "") {
    return res.status(400).send("Pitanje je obavezno.");
  }

  try {
    const prompt = `Na osnovu analize svih poznatih podataka, statistike, logike i iskustva, odgovori sa DA ili NE i proceni verovatnoću ostvarenja sledećeg pitanja: "${pitanje}"`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const odgovor = completion.data.choices[0].message.content.trim();
    res.json({ odgovor });
  } catch (error) {
    console.error("❌ Greška pri kontaktiranju OpenAI:");
    console.error(error); // detaljan ispis cele greške
    res.status(500).send("Došlo je do greške pri obradi zahteva.");
  }
});

// Pokretanje servera
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server pokrenut na portu ${PORT}`);
});
