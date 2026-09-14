const OA_REPO = 'perixtar/Tech-OA-Interview-Questions'

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildPrepLinks(companyName) {
  const query = encodeURIComponent(companyName)
  const slug = slugify(companyName)
  return {
    githubOA: `https://github.com/search?q=repo%3A${encodeURIComponent(OA_REPO)}+${query}&type=code`,
    glassdoor: `https://www.glassdoor.com/Interview/index.htm?sc.keyword=${query}`,
    leetcode: `https://leetcode.com/company/${slug}/`,
  }
}
