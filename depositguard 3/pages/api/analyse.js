import Anthropic from '@anthropic-ai/sdk'

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { images, address, inspType, deposit, notes } = req.body

  if (!images || !images.length) {
    return res.status(400).json({ error: 'No images provided' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const content = []

  for (const img of images) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mediaType,
        data: img.data,
      },
    })
  }

  const depositLine = deposit ? `The total deposit held is £${deposit}.` : ''

  content.push({
    type: 'text',
    text: `You are an expert property inventory clerk, chartered surveyor, and tenancy dispute specialist conducting a ${inspType} inspection.

Property: ${address}
${depositLine}
${notes ? 'Context: ' + notes : ''}

Examine EVERY image carefully. For each visible issue assess:
1. What the issue is and where
2. Whether it is damage (tenant liability) or fair wear and tear (landlord cost)
3. A realistic cost to remedy in GBP (UK 2024 market rates)

IMPORTANT: Only suggest deductions for DAMAGE beyond fair wear and tear. Be fair and reasonable.

Respond ONLY with valid JSON, no markdown fences, no explanation:
{
  "overallScore": 68,
  "overallCondition": "Fair",
  "summary": "Two sentence professional summary of overall property condition.",
  "totalDeduction": 420,
  "urgentItems": 2,
  "advisoryItems": 3,
  "wearItems": 4,
  "deductions": [
    {
      "item": "Large burn mark on kitchen worktop",
      "room": "Kitchen",
      "severity": "high",
      "reason": "Damage beyond fair wear and tear",
      "cost": 180
    }
  ],
  "rooms": [
    {
      "name": "Kitchen",
      "condition": "Fair",
      "findings": [
        { "text": "Worktop in good condition overall", "type": "normal" },
        { "text": "Burn mark near hob", "type": "issue" },
        { "text": "Minor limescale on taps — fair wear and tear", "type": "advisory" }
      ]
    }
  ],
  "dispute": "Formal 3-paragraph dispute-ready statement. Para 1: property and inspection context. Para 2: damage found and why tenant-liable. Para 3: deduction breakdown and total withheld with justification."
}`,
  })

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5-20251101',
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    })

    const raw = message.content.map((b) => b.text || '').join('')
    const clean = raw.replace(/```json|```/g, '').trim()
    const j0 = clean.indexOf('{')
    const j1 = clean.lastIndexOf('}')
    const report = JSON.parse(clean.slice(j0, j1 + 1))

    return res.status(200).json({ report })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Analysis failed' })
  }
}
