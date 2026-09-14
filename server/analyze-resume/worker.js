// Cloudflare Worker: server-side resume-vs-job-description analysis.
//
// This is real, deployable code — it is NOT deployed anywhere right now.
// The frontend (src/lib/resumeAnalysis.js) only calls it if you build the
// site with VITE_RESUME_API_URL set to this worker's URL. Until then the
// app uses the local, non-AI keyword comparison and says so honestly.
//
// Setup (you do this — it needs your own Cloudflare account and API key,
// neither of which an assistant can create on your behalf):
//   1. npm install -g wrangler
//   2. wrangler login
//   3. wrangler kv namespace create RESUME_RATE_LIMIT
//      (put the returned id into wrangler.toml, see wrangler.toml.example)
//   4. wrangler secret put ANTHROPIC_API_KEY
//      (paste your own Anthropic API key when prompted — it is stored
//      encrypted by Cloudflare and never touches the frontend bundle)
//   5. wrangler deploy
//   6. Set ALLOWED_ORIGIN below (or as a var in wrangler.toml) to your
//      GitHub Pages origin, e.g. https://surya0901.github.io
//   7. Rebuild the frontend with VITE_RESUME_API_URL=<your worker URL>

const MAX_INPUT_LENGTH = 20000
const RATE_LIMIT_PER_HOUR = 20

export default {
  async fetch(request, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || '*'
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, corsHeaders)
    }

    let body
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400, corsHeaders)
    }

    const { jobDescription, resume } = body ?? {}
    if (typeof jobDescription !== 'string' || typeof resume !== 'string') {
      return json({ error: 'jobDescription and resume must be strings' }, 400, corsHeaders)
    }
    if (!jobDescription.trim() || !resume.trim()) {
      return json({ error: 'jobDescription and resume must not be empty' }, 400, corsHeaders)
    }
    if (jobDescription.length > MAX_INPUT_LENGTH || resume.length > MAX_INPUT_LENGTH) {
      return json({ error: `Inputs must be under ${MAX_INPUT_LENGTH} characters` }, 413, corsHeaders)
    }

    if (env.RESUME_RATE_LIMIT) {
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
      const limited = await isRateLimited(env.RESUME_RATE_LIMIT, clientIp)
      if (limited) {
        return json({ error: 'Rate limit exceeded. Try again later.' }, 429, corsHeaders)
      }
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'AI backend not configured (missing ANTHROPIC_API_KEY)' }, 503, corsHeaders)
    }

    try {
      const analysis = await callAnthropic(env.ANTHROPIC_API_KEY, jobDescription, resume)
      return json(analysis, 200, corsHeaders)
    } catch (err) {
      return json({ error: 'AI analysis failed', detail: String(err) }, 502, corsHeaders)
    }
  },
}

async function isRateLimited(kv, clientIp) {
  const windowKey = `rl:${clientIp}:${Math.floor(Date.now() / 3600000)}`
  const current = Number((await kv.get(windowKey)) || '0')
  if (current >= RATE_LIMIT_PER_HOUR) return true
  await kv.put(windowKey, String(current + 1), { expirationTtl: 3600 })
  return false
}

async function callAnthropic(apiKey, jobDescription, resume) {
  const systemPrompt = `You compare a resume against a job description for a truthful, honest analysis. Rules:
- Only use skills/keywords that literally appear in the job description text.
- Only cite resume evidence that literally appears in the resume text — quote it, don't paraphrase into something stronger.
- Never invent metrics, accomplishments, or years of experience not present in the resume.
- Bullet rewrite suggestions must only rearrange/clarify facts already stated in the resume — do not add numbers or outcomes that aren't there.
- Respond ONLY with JSON matching this shape: {"matchedKeywords": string[], "missingKeywords": string[], "bulletSuggestions": [{"original": string, "suggested": string}], "realityCheck": string[]}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME:\n${resume}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`Anthropic API HTTP ${res.status}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{}'
  return JSON.parse(text)
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}
