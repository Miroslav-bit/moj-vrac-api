import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { OpenAI } from "openai";

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Provera da li je postavljen API ključ
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
    const prompt = `Na osnovu analize svih poznatih podataka, statistike, logike i iskustva, odgovori sa DA ili NE, proceni verovatnoću i u sledećem pasusu izrazi je samo u procentima, a u trećem pasusu u nekoliko reči objasni na osnovu čega si zaključio takvu procenu: "${pitanje}"`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.6,
      max_tokens: 150,
    });

    const odgovor = completion.choices[0].message.content.trim();
    res.json({ odgovor });
  } catch (error) {
    console.error("Greška u OpenAI pozivu:", error);
    res.status(500).send("Greška u obradi zahteva.");
  }
});

// Pokretanje servera
app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
