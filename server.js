const express = require("express");
const Anthropic = require("@anthropic-ai/sdk");
const path = require("path");

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.static(path.join(__dirname, "public")));

const anthropic = new Anthropic();

const EXTRACTION_PROMPT = `You are a medical scribe AI for an aesthetic medicine clinic specialising in botox and dermal filler treatments. Given an audio transcript from a consultation, extract and structure the clinical notes.

Output the notes in the following structured format. Only include sections that have relevant information in the transcript. Use standard medical abbreviations where appropriate.

**FORMAT:**

**Patient Demographics:**
Age, gender

**Medical History:**
PMH (past medical history), DHx (drug history), allergies (NKDA if none), pregnancy/breastfeeding status, history of anaphylaxis, bee/wasp sting allergy, any contraindications to treatment

**Previous Treatments:**
Previous aesthetic treatments, products used, amounts, outcomes, what they liked/disliked

**Presenting Concerns:**
What the patient wants to address, their goals

**Consultation & Consent:**
Treatment explained, risks discussed and consented for (bruising, swelling, infection, nodules, migration, vascular occlusion, ptosis, asymmetry etc.), duration of results discussed

**Treatment Plan:**
Numbered list of planned treatments with details

**Treatment Performed:**
For each area treated:
- Area
- Product and amount
- Technique (needle/cannula gauge, plane, bolus/linear threading etc.)
- Any specific notes (positive aspirates, pain, blanching, CRT)

**Anaesthesia:**
Numbing method used (LMX, EMLA etc.)

**Immediate Post-Treatment:**
Complications (nil if none), pain, blanching, CRT, floor of mouth check if relevant, patient satisfaction

**Aftercare:**
Advice given (verbal/written/emailed), safety net advice, follow-up instructions

**Skincare Recommendations:**
If discussed

**Key Abbreviations Used:**
List any abbreviations with their meanings for clarity

IMPORTANT RULES:
- Be precise with units, volumes (mls), and dosages (units)
- Record exact product names (Azzalure, Restylane Lyft, etc.)
- Record reconstitution details if mentioned
- Note laterality (L/R) where mentioned
- Keep the clinical tone professional and concise
- If dosages are given per area, calculate and note totals
- Note injection planes (periosteal, subcutaneous, intradermal etc.)
- If something is unclear in the transcript, note it as [unclear from transcript]
- Do NOT fabricate information not present in the transcript`;

app.post("/api/extract", async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: "No transcript provided" });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `Here is an audio transcript from an aesthetic clinic consultation. Please extract and structure the clinical notes:\n\n${transcript}`,
        },
      ],
      system: EXTRACTION_PROMPT,
    });

    const extractedNotes = message.content[0].text;
    res.json({ notes: extractedNotes });
  } catch (error) {
    console.error("Extraction error:", error);
    res.status(500).json({
      error: "Failed to extract notes. Please check your API key and try again.",
    });
  }
});

const LOT_SCAN_PROMPT = `You are a product identification AI for an aesthetic medicine clinic. You will be shown a photo of one or more product boxes (e.g. Botox, Azzalure, Bocouture, Restylane, Juvederm, etc.).

Extract the following from each product visible in the image:
- Product name
- Lot number (also called batch number)
- Expiry date

Return your response as a JSON array ONLY, with no other text. Each element should have these fields:
- "product": the product name
- "lot": the lot/batch number
- "expiry": the expiry date (formatted as DD/MM/YYYY if possible)

If you cannot find a field, use null for that field.
If no products are visible, return an empty array: []

Example response:
[{"product": "Azzalure 125 Speywood Units", "lot": "A12345", "expiry": "01/06/2026"}]

Return ONLY the JSON array, no markdown, no explanation.`;

app.post("/api/scan-lot", async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  try {
    // Extract base64 data and media type from data URL
    const match = image.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ error: "Invalid image format" });
    }

    const mediaType = match[1];
    const base64Data = match[2];

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: "Extract all lot numbers and expiry dates from the product boxes in this image.",
            },
          ],
        },
      ],
      system: LOT_SCAN_PROMPT,
    });

    const responseText = message.content[0].text.trim();
    let results;
    try {
      results = JSON.parse(responseText);
    } catch {
      // If JSON parse fails, try extracting JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      results = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    }

    res.json({ results });
  } catch (error) {
    console.error("Scan error:", error);
    res.status(500).json({
      error: "Failed to scan image. Please check your API key and try again.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
