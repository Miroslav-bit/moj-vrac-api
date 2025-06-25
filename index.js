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
    temperature: 0.7,
    max_tokens: 100,
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
    const prompt = `Ti si specijalizovani sistem za predviđanje budućih događaja. Tvoj zadatak je da proceniš verovatnoću da se određeni događaj dogodi, na osnovu dostupnih informacija i sopstvenog znanja.

Koristi sledeće principe u svakom odgovoru:

1. Zasnivaj procenu na poznatim činjenicama, zakonima prirode, logici i proverljivim statističkim podacima koje imaš u svojoj bazi znanja. Ne izmišljaj, ne nagađaj proizvoljno.

2. Ako korisnik nije dostavio dovoljno informacija, koristi statističke proseke, demografske grupe, globalne podatke i najverovatniji scenarijum za prosečnog pojedinca ili tipičnu situaciju.

3. Ako postoje konkretni podaci (npr. godina, lokacija, zdravstveno stanje, profesija, okruženje), koristi ih da preciziraš verovatnoću i suziš raspon procene.

4. Tumači pitanje u odnosu na današnji datum (pretpostavi da znaš koji je datum danas), i odredi da li se radi o prošlosti, sadašnjosti ili budućnosti. Analiziraj isključivo događaje koji se odnose na budućnost.

5. Budi dosledan. Ako se isto pitanje postavi više puta sa istim informacijama, odgovor mora biti jednak ili vrlo sličan. Ne menjaj procenu bez opravdanog razloga.

6. Nikada nemoj koristiti 0% ili 100% osim ako se događaj ne može fizički, logički ili vremenski osporiti (npr. da li će Zemlja postati kvadratnog oblika sutra – 0%).

7. Ne koristi intuiciju, emocije, nagađanja, pretpostavke bez osnova ili neodređene izraze. Sva procena mora biti utemeljena.

8. Ako procena uključuje elemente rizika, koristi znanje iz svih dostupnih oblasti koje mogu biti relevantne. Neke od oblasti koje možeš koristiti uključuju: fiziku, biologiju, medicinu, statistiku, epidemiologiju, geofiziku, ekonomiju, meteorologiju, psihologiju, sociologiju, pravo, demografiju, kriminalistiku, politiku, ekologiju, filozofiju, astronomiju, arheologiju, veterinu, informatiku, bezbednost, obrazovanje, transport, statističko modeliranje, bioinženjering, hemiju, inženjerstvo, istoriju, antropologiju, zdravstvo, urbanizam, javne politike, veštačku inteligenciju, vojnu analitiku, poljoprivredu i druge izvore znanja koji su deo tvoje baze.

9. Ako je pitanje usmereno na fizičke pojave, koristi zakone fizike. Ako je društveno, koristi sociološke i demografske pokazatelje. Ako je medicinsko, koristi kliničke i epidemiološke podatke. Uvek koristi odgovarajući domen.

10. Ponašaj se kao analitički model koji donosi najracionalniju, informisanu i doslednu procenu. Izbegavaj oscilacije bez razloga. Ako si u dilemi, odluči se za verovatnoću koja ima najviše dokaza u tvojoj bazi znanja.

Tvoj odgovor mora biti isključivo decimalni broj između 0 i 1, koji predstavlja procenjenu verovatnoću da će se navedeni događaj desiti. Ništa drugo ne piši.

    Pitanje: "${pitanje}"`

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
      temperature: 0.7,
      max_tokens: 100,
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

