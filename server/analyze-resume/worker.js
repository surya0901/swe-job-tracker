// Cloudflare Worker: server-side, job-specific resume bullet-rewrite
// tailoring (POST /tailor).
//
// This is real, deployable code — it is NOT deployed anywhere right now.
// src/lib/resume/tailoring.js calls it only if the site is built with
// VITE_RESUME_TAILOR_API_URL set. Until then, the app uses local,
// deterministic (non-AI) gap analysis and says so honestly in the UI —
// see src/lib/resume/tailoring.js's compareResumeToJob, which needs no
// backend and always runs.
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
//   7. Rebuild the frontend with VITE_RESUME_TAILOR_API_URL=<worker URL>/tailor
//
// This worker never logs full resume/job-description content — only
// request metadata (status, timing) reaches Cloudflare's own platform
// logs, and nothing is persisted by this code itself.

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

    const url = new URL(request.url)
    if (url.pathname !== '/tailor') {
      return json({ error: 'Not found. POST to /tailor.' }, 404, corsHeaders)
    }
    return handleTailor(request, env, corsHeaders)
  },
}

async function handleTailor(request, env, corsHeaders) {
  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, corsHeaders)
  }

  const { resume, jobDescription, scope } = body ?? {}
  if (!resume || typeof jobDescription !== 'string' || !jobDescription.trim()) {
    return json({ error: 'resume (structured object) and jobDescription (string) are required' }, 400, corsHeaders)
  }
  const resumeJson = JSON.stringify(resume)
  if (resumeJson.length > MAX_INPUT_LENGTH || jobDescription.length > MAX_INPUT_LENGTH) {
    return json({ error: `Inputs must be under ${MAX_INPUT_LENGTH} characters` }, 413, corsHeaders)
  }

  try {
    const suggestions = await callAnthropicTailor(env.ANTHROPIC_API_KEY, resume, jobDescription, scope)
    return json({ suggestions }, 200, corsHeaders)
  } catch (err) {
    return json({ error: 'AI tailoring failed', detail: String(err) }, 502, corsHeaders)
  }
}

async function isRateLimited(kv, clientIp) {
  const windowKey = `rl:${clientIp}:${Math.floor(Date.now() / 3600000)}`
  const current = Number((await kv.get(windowKey)) || '0')
  if (current >= RATE_LIMIT_PER_HOUR) return true
  await kv.put(windowKey, String(current + 1), { expirationTtl: 3600 })
  return false
}

const SCOPE_GUIDANCE = {
  light: 'Only adjust wording and swap in JD terminology the resume already supports. Do not reorder or restructure.',
  balanced: 'Rewrite and reorder bullets for relevance, within the truthfulness rules below.',
  focused: "Prioritize the candidate's most relevant verified experience for this specific role.",
}

async function callAnthropicTailor(apiKey, resume, jobDescription, scope) {
  const systemPrompt = `You suggest truthful, job-specific resume bullet rewrites. The candidate's resume is given as structured JSON (experience[].bullets, projects[].bullets, skills, education). You will propose edits to EXISTING bullets only — never invent new bullets, new employers, new dates, or new degrees.

Absolute rules (violating any of these makes a suggestion invalid):
- Never invent metrics, percentages, user counts, or performance numbers not already present in the bullet.
- Never change a technology name to a different one (e.g. never Java -> JavaScript, never turn "familiar with" into "expert in").
- Never claim a deployment/infra/scale detail not stated (e.g. never say "deployed on AWS" if the resume doesn't say that).
- Never turn coursework or a class project into professional employment, and never add years of experience, certifications, or clearance that aren't in the resume.
- Every proposed rewrite must be traceable to the ORIGINAL bullet's own facts — only wording/emphasis/ordering may change.
- If a bullet could be stronger with a metric that isn't in the resume, do NOT invent one — omit that suggestion instead.

Scope for this request: ${SCOPE_GUIDANCE[scope] ?? SCOPE_GUIDANCE.balanced}

Respond ONLY with JSON: {"suggestions": [{"id": string, "entryIndex": number, "bulletIndex": number, "originalText": string, "proposedText": string, "explanation": string}]}. entryIndex/bulletIndex refer to positions in resume.experience[entryIndex].bullets[bulletIndex]. originalText must exactly match the existing bullet text.`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `JOB DESCRIPTION:\n${jobDescription}\n\nRESUME (JSON):\n${JSON.stringify(resume)}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`Anthropic API HTTP ${res.status}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{"suggestions":[]}'
  const parsed = JSON.parse(text)
  return Array.isArray(parsed.suggestions) ? parsed.suggestions : []
}

function json(data, status, extraHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}
