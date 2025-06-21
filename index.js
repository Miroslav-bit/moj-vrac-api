const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { OpenAI } = require("openai");
require("dotenv").config(); // ako koristiš .env fajl

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
    const lang = req.body.lang || "sr";

    const prompts = {
      sr: `Na osnovu analize svih poznatih podataka, statistike, logike i iskustva, odgovori sa DA ili NE i proceni verovatnoću:`,
      en: `Based on the analysis of all known data, statistics, logic, and experience, respond with YES or NO and estimate the probability:`,
      de: `Basierend auf der Analyse aller bekannten Daten, Statistiken, Logik und Erfahrungen, antworte mit JA oder NEIN und schätze die Wahrscheinlichkeit:`,
      es: `Basado en el análisis de todos los datos conocidos, estadísticas, lógica y experiencia, responde con SÍ o NO y estima la probabilidad:`,
      fr: `Sur la base de l'analyse de toutes les données connues, des statistiques, de la logique et de l'expérience, répondez par OUI ou NON et estimez la probabilité :`,
      it: `In base all'analisi di tutti i dati noti, delle statistiche, della logica e dell'esperienza, rispondi SÌ o NO e stima la probabilità:`,
      pt: `Com base na análise de todos os dados conhecidos, estatísticas, lógica e experiência, responda com SIM ou NÃO e estime a probabilidade:`,
      ru: `На основе анализа всех известных данных, статистики, логики и опыта, ответьте ДА или НЕТ и оцените вероятность:`
    };

    const promptTemplate = prompts[lang] || prompts["sr"];
    const prompt = `${promptTemplate} "${pitanje}"`;

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

// Pokretanje servera
app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
