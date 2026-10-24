// Delivery channels. Both use plain fetch so they run in Node (GitHub
// Actions) and in a Cloudflare Worker alike.
//   - Email via Resend (RESEND_API_KEY, ALERT_EMAIL_TO, optional ALERT_EMAIL_FROM)
//   - Phone push via ntfy.sh (NTFY_TOPIC, optional NTFY_SERVER) — no account needed
// A channel counts as configured only if its variables are set; the caller
// treats an alert as delivered if at least one configured channel succeeded.

export function configuredChannels(env) {
  const channels = []
  if (env.RESEND_API_KEY && env.ALERT_EMAIL_TO) channels.push('email')
  if (env.NTFY_TOPIC) channels.push('push')
  return channels
}

async function sendEmail(message, env, fetchImpl) {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.ALERT_EMAIL_FROM || 'Job Alerts <onboarding@resend.dev>',
      to: env.ALERT_EMAIL_TO.split(',').map((s) => s.trim()),
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  })
  if (!res.ok) throw new Error(`Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

// HTTP header values must be Latin-1, so fetch throws on titles like
// "Stripe — Software Engineer". ntfy decodes RFC 2047 encoded-words, so
// non-ASCII text goes through as =?UTF-8?B?...?=.
export function headerText(value) {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`
}

const asciiUrl = (url) => url.replace(/[^\x21-\x7e]/g, (ch) => encodeURIComponent(ch))

async function sendPush(message, env, fetchImpl) {
  const server = (env.NTFY_SERVER || 'https://ntfy.sh').replace(/\/$/, '')
  const res = await fetchImpl(`${server}/${encodeURIComponent(env.NTFY_TOPIC)}`, {
    method: 'POST',
    headers: {
      Title: headerText(message.subject),
      Priority: 'high',
      Tags: 'briefcase',
      ...(message.firstUrl ? { Click: asciiUrl(message.firstUrl) } : {}),
    },
    body: message.text.slice(0, 3500),
  })
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}`)
}

export async function deliver(message, env, fetchImpl = fetch) {
  const channels = configuredChannels(env)
  const results = { delivered: [], failed: [], configured: channels }
  for (const channel of channels) {
    try {
      await (channel === 'email' ? sendEmail : sendPush)(message, env, fetchImpl)
      results.delivered.push(channel)
    } catch (err) {
      results.failed.push({ channel, error: String(err.message ?? err) })
    }
  }
  return results
}
