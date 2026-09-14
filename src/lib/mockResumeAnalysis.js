// Mock analysis output for the Resume Assistant UI.
//
// TO WIRE UP A REAL LLM:
//   Replace analyzeResume() with a call to your own API route, e.g.
//     const res = await fetch('/api/analyze-resume', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ jobDescription, resume }),
//     })
//     return await res.json()
//   That route would call the Anthropic or OpenAI API server-side (never
//   expose an LLM API key in frontend code) with a prompt asking it to
//   return JSON shaped like the object below.

const SIMULATED_LATENCY_MS = 1400

export function analyzeResume(jobDescription, resume) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(buildMockAnalysis(jobDescription, resume))
    }, SIMULATED_LATENCY_MS)
  })
}

function buildMockAnalysis() {
  return {
    missingKeywords: [
      'Kubernetes',
      'CI/CD',
      'System Design',
      'gRPC',
      'Terraform',
      'A/B Testing',
      'Distributed Systems',
    ],
    bulletSuggestions: [
      {
        original:
          'Worked on a web app that improved how users manage tasks.',
        suggested:
          'Architected a React/Node task-management platform serving 5K+ MAUs, cutting median task-completion time 32% via optimistic UI updates and a Redis-backed caching layer.',
      },
      {
        original: 'Helped the team fix bugs and write tests.',
        suggested:
          'Drove test coverage from 41% to 78% by authoring 120+ unit/integration tests (Jest, React Testing Library), reducing regression incidents in production by 25%.',
      },
      {
        original: 'Used SQL to get data for reports.',
        suggested:
          'Designed optimized SQL queries and materialized views that cut dashboard load time from 8s to under 1s for 200+ daily active analysts.',
      },
    ],
    realityCheck: [
      'The JD asks for "2+ years of production Kubernetes experience" — your resume shows coursework/side-project exposure only. Be ready to speak honestly about depth here.',
      'No mention of large-scale distributed systems work. If asked in an interview, frame your experience in terms of the largest scale system you\'ve touched, even if academic.',
      'The role lists gRPC and protobuf; your resume only shows REST APIs. Consider a short side project or at least being able to explain the conceptual differences.',
    ],
  }
}
