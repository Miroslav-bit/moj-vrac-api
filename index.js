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
    const prompt = `Korisnik će postaviti pitanje koje počinje sa \"Da li ću\", \"Da li će\", \"Da li će se\" ili \"Da li ćemo\", a na koje je moguće odgovoriti sa DA ili NE.

Na osnovu dostupnih informacija, statistike, logike i prethodnih obrazaca, proceni verovatnoću da je odgovor na to pitanje potvrdan (DA), i izrazi je isključivo kao broj između 0 i 1 (decimalna vrednost). Ne dodaj nikakvo objašnjenje ni propratni tekst. Primer: 0.78

Pitanje: \"${pitanje}\"`;

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
    const odgovor = verovatnoca > 0.5 ? "DA" : "NE";

    res.json({ odgovor: `${odgovor}, verovatnoća ${procenat}%` });

  } catch (error) {
    console.error("❌ Greška u OpenAI pozivu:", error);
    res.status(500).send("Greška u obradi zahteva.");
  }
});

app.listen(port, () => {
  console.log(`🔮 Vrač server aktivan na portu ${port}`);
});
