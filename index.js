// Backend API za aplikaciju "Vrač-Pogađač"
// Tehnologija: Node.js + Express

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ➤ OVDE UNESI SVOJ API KLJUČ
if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY nije postavljen!");
  process.exit(1);
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

// Prompt koji koristiš u GPT
function generatePrompt(userQuestion) {
  return `Ti si vrač, mistični pogađač sudbine koji odgovara na pitanja o budućim događajima.
Na osnovu logike, opšteg znanja, procene rizika i obrazaca iz stvarnog sveta,
analiziraš postavljeno pitanje i daješ odgovor isključivo u sledećem formatu:

1. DA ili NE (kao konačan odgovor)
2. Verovatnoća u procentima (npr. Verovatnoća: 68%)
3. Kratka simbolična poruka vrača (maks. 15 reči)

Pitanje korisnika: "${userQuestion}"

Odgovori po formatu. Nema objašnjenja, samo formatirani rezultat.`;
}

app.post('/api/predvidi', async (req, res) => {
  const { question } = req.body;

  if (!question || question.trim() === '') {
    return res.status(400).json({ error: 'Pitanje je obavezno.' });
  }

  try {
    const completion = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: generatePrompt(question) }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const result = completion.data.choices[0].message.content;
    res.json({ response: result });

  } catch (error) {
    console.error('Greška u GPT pozivu:', error);
    res.status(500).json({ error: 'Došlo je do greške u AI obradi.' });
  }
});

app.listen(port, () => {
  console.log(`Vrač server pokrenut na http://localhost:${port}`);
});
