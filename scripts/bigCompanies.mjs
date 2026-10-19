// The "top tier" list the alerts and the Top Companies filter use. This
// is a judgment call (mega-cap tech, elite quant/trading shops, the
// biggest banks and the most sought-after AI/infra companies) — edit it
// freely. Names must match the company names in scripts/companies.mjs.
//
// Being on this list does NOT mean we can poll the company: Google,
// Meta, Microsoft, Citadel, Goldman Sachs and Morgan Stanley have no
// public job feed we could verify, so they appear in the directory as
// "check manually" and cannot trigger an alert. See COVERAGE below.

export const TOP_COMPANY_NAMES = new Set([
  // Mega-cap tech
  'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple', 'NVIDIA', 'Salesforce', 'Adobe', 'Oracle', 'IBM',
  'Cisco', 'Intel', 'Qualcomm', 'Uber', 'Intuit', 'ServiceNow',
  // AI / data / infra
  'OpenAI', 'Anthropic', 'Databricks', 'Palantir Technologies', 'Stripe', 'Snowflake', 'Waymo',
  // Quant / trading
  'Citadel', 'Citadel Securities', 'Jane Street', 'Jump Trading', 'IMC Trading', 'DRW', 'Point72',
  'Virtu Financial', 'Akuna Capital', 'Two Sigma', 'Hudson River Trading', 'D. E. Shaw',
  // Banks / payments
  'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Bank of America', 'Citigroup', 'Wells Fargo',
  'Capital One', 'American Express', 'Visa', 'Mastercard', 'PayPal', 'Barclays',
  // Other
  'Airbnb', 'Coinbase', 'Walmart', 'Netflix', 'Tesla',
])

export function isTopCompany(name) {
  return TOP_COMPANY_NAMES.has(name)
}
