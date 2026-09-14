// Company directory. This is the input to the collector — it is NOT the
// job dataset. `atsCandidates` are guesses at a company's Greenhouse/Lever/
// Ashby board token; the collector actually calls each API and only keeps
// ones that return real data (status becomes "connected"). A guess that
// fails is recorded as a failure, not silently dropped or faked.
//
// `careersUrl` for the manual-only (non-ATS) companies below comes from
// general knowledge of well-known corporate domains, not a live fetch in
// this session — the collector marks these "manual_verification_needed"
// rather than "connected", and the UI/report says so explicitly. Treat
// them as a researched starting point, not verified live postings.

export const atsCandidateCompanies = [
  // name, industry, [{adapter, token}, ...] — order = try priority
  ['Stripe', 'Fintech', [{ adapter: 'greenhouse', token: 'stripe' }]],
  ['Airbnb', 'Travel Tech', [{ adapter: 'greenhouse', token: 'airbnb' }]],
  ['Robinhood', 'Fintech', [{ adapter: 'greenhouse', token: 'robinhood' }]],
  ['DoorDash', 'Logistics Tech', [{ adapter: 'greenhouse', token: 'doordash' }]],
  ['Affirm', 'Fintech', [{ adapter: 'greenhouse', token: 'affirm' }]],
  ['Asana', 'SaaS', [{ adapter: 'greenhouse', token: 'asana' }]],
  ['Coinbase', 'Fintech/Crypto', [{ adapter: 'greenhouse', token: 'coinbase' }]],
  ['Databricks', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'databricks' }]],
  ['Discord', 'Consumer Tech', [{ adapter: 'greenhouse', token: 'discord' }]],
  ['Dropbox', 'SaaS', [{ adapter: 'greenhouse', token: 'dropbox' }]],
  ['Figma', 'SaaS', [{ adapter: 'greenhouse', token: 'figma' }]],
  ['Instacart', 'Retail Tech', [{ adapter: 'greenhouse', token: 'instacart' }]],
  ['Lyft', 'Transportation Tech', [{ adapter: 'greenhouse', token: 'lyft' }]],
  ['Notion', 'SaaS', [{ adapter: 'greenhouse', token: 'notion' }, { adapter: 'ashby', token: 'notion' }]],
  ['Okta', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'okta' }]],
  ['Pinterest', 'Consumer Tech', [{ adapter: 'greenhouse', token: 'pinterest' }]],
  ['Reddit', 'Consumer Tech', [{ adapter: 'greenhouse', token: 'reddit' }]],
  ['Snowflake', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'snowflake' }]],
  ['Squarespace', 'SaaS', [{ adapter: 'greenhouse', token: 'squarespace' }]],
  ['Twilio', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'twilio' }]],
  ['Webflow', 'SaaS', [{ adapter: 'greenhouse', token: 'webflow' }]],
  ['Wealthfront', 'Fintech', [{ adapter: 'greenhouse', token: 'wealthfront' }]],
  ['Gusto', 'Fintech', [{ adapter: 'greenhouse', token: 'gusto' }]],
  ['Brex', 'Fintech', [{ adapter: 'greenhouse', token: 'brex' }]],
  ['Plaid', 'Fintech', [{ adapter: 'greenhouse', token: 'plaid' }]],
  ['Ramp', 'Fintech', [{ adapter: 'greenhouse', token: 'ramp' }, { adapter: 'ashby', token: 'ramp' }]],
  ['Rippling', 'SaaS', [{ adapter: 'greenhouse', token: 'rippling' }]],
  ['Scale AI', 'AI/ML', [{ adapter: 'greenhouse', token: 'scaleai' }]],
  ['Anthropic', 'AI/ML', [{ adapter: 'greenhouse', token: 'anthropic' }]],
  ['OpenAI', 'AI/ML', [{ adapter: 'greenhouse', token: 'openai' }]],
  ['HashiCorp', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'hashicorp' }]],
  ['Confluent', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'confluent' }]],
  ['MongoDB', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'mongodb' }]],
  ['Elastic', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'elastic' }]],
  ['GitLab', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'gitlab' }]],
  ['Datadog', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'datadog' }]],
  ['PagerDuty', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'pagerduty' }]],
  ['Amplitude', 'SaaS', [{ adapter: 'greenhouse', token: 'amplitude' }]],
  ['Braze', 'SaaS', [{ adapter: 'greenhouse', token: 'braze' }]],
  ['Grammarly', 'AI/ML', [{ adapter: 'greenhouse', token: 'grammarly' }]],
  ['Duolingo', 'EdTech', [{ adapter: 'greenhouse', token: 'duolingo' }]],
  ['Roblox', 'Gaming', [{ adapter: 'greenhouse', token: 'roblox' }]],
  ['Unity', 'Gaming', [{ adapter: 'greenhouse', token: 'unity' }]],
  ['Cloudflare', 'Enterprise Tech', [{ adapter: 'greenhouse', token: 'cloudflare' }]],
  ['Samsara', 'IoT', [{ adapter: 'greenhouse', token: 'samsara' }]],
  ['Toast', 'Fintech', [{ adapter: 'greenhouse', token: 'toast' }]],
  ['Benchling', 'Biotech Software', [{ adapter: 'greenhouse', token: 'benchling' }]],
  ['Carta', 'Fintech', [{ adapter: 'greenhouse', token: 'carta' }]],
  ['Palantir Technologies', 'Enterprise Tech', [{ adapter: 'lever', token: 'palantir' }]],
  ['Attentive', 'MarTech', [{ adapter: 'lever', token: 'attentive' }]],
  ['Postman', 'Enterprise Tech', [{ adapter: 'lever', token: 'postman' }]],
  ['Betterment', 'Fintech', [{ adapter: 'lever', token: 'betterment' }]],
  ['SeatGeek', 'Consumer Tech', [{ adapter: 'lever', token: 'seatgeek' }]],
  ['Linear', 'SaaS', [{ adapter: 'ashby', token: 'linear' }]],
  ['Vanta', 'Enterprise Tech', [{ adapter: 'ashby', token: 'vanta' }]],
  ['Mercury', 'Fintech', [{ adapter: 'ashby', token: 'mercury' }]],
  ['Retool', 'Enterprise Tech', [{ adapter: 'ashby', token: 'retool' }]],
  ['Watershed', 'Climate Tech', [{ adapter: 'ashby', token: 'watershed' }]],
  ['Modern Treasury', 'Fintech', [{ adapter: 'ashby', token: 'moderntreasury' }]],
  ['Deel', 'HR Tech', [{ adapter: 'ashby', token: 'deel' }]],
]

// Large / traditional employers that run well-known TDP / rotational /
// leadership-development programs but do not publish a Greenhouse/Lever/
// Ashby feed (Workday, SuccessFactors, or a custom ATS instead). Careers
// URLs are well-known corporate domains from general knowledge, not
// fetched live this session — treat as a starting point to verify, not a
// confirmed live feed. Status is always "manual_verification_needed".
export const manualCompanies = [
  // Finance
  ['JPMorgan Chase', 'Finance', 'https://careers.jpmorgan.com', 'Software Engineer Program'],
  ['Goldman Sachs', 'Finance', 'https://www.goldmansachs.com/careers', 'New Analyst Program'],
  ['Morgan Stanley', 'Finance', 'https://www.morganstanley.com/careers', 'Technology Analyst Program'],
  ['Bank of America', 'Finance', 'https://careers.bankofamerica.com', 'Technology Development Program'],
  ['Citigroup', 'Finance', 'https://jobs.citi.com', 'Technology Development Program'],
  ['American Express', 'Finance', 'https://www.americanexpress.com/en-us/careers', 'Technology Rotation Program'],
  ['BNY Mellon', 'Finance', 'https://www.bny.com/careers', 'Technology Early Talent Program'],
  ['Charles Schwab', 'Finance', 'https://www.schwabjobs.com', 'Technology Rotational Program'],
  ['Visa', 'Finance', 'https://usa.visa.com/careers.html', 'Technology Engineering Rotational Program'],
  ['Mastercard', 'Finance', 'https://careers.mastercard.com', 'Software Engineer New Grad'],
  ['PayPal', 'Fintech', 'https://careers.pypl.com', 'Technology Rotational Program'],
  ['Synchrony', 'Finance', 'https://www.synchronycareers.com', 'Technology Leadership Program'],
  ['Discover Financial Services', 'Finance', 'https://jobs.discover.com', 'Technology Development Program'],
  ['Ally Financial', 'Finance', 'https://ally.com/careers', 'Technology Development Program'],
  ['Northern Trust', 'Finance', 'https://careers.northerntrust.com', 'Technology Graduate Program'],
  ['Truist Financial', 'Finance', 'https://careers.truist.com', 'Technology Development Program'],
  // Insurance / healthcare
  ['Progressive Insurance', 'Insurance', 'https://www.progressive.com/careers', 'Technology Development Program'],
  ['State Farm', 'Insurance', 'https://www.statefarm.com/careers', 'Technology Associate Program'],
  ['Allstate', 'Insurance', 'https://www.allstate.com/careers', 'Technology Rotational Program'],
  ['Liberty Mutual', 'Insurance', 'https://jobs.libertymutualgroup.com', 'Technology Development Program'],
  ['Nationwide', 'Insurance', 'https://www.nationwide.com/careers', 'Technology Leadership Program'],
  ['Travelers', 'Insurance', 'https://careers.travelers.com', 'Technology Leadership Development Program'],
  ['MetLife', 'Insurance', 'https://www.metlife.com/careers', 'Technology Rotational Program'],
  ['Prudential Financial', 'Insurance', 'https://jobs.prudential.com', 'Technology Leadership Program'],
  ['UnitedHealth Group', 'Healthcare', 'https://careers.unitedhealthgroup.com', 'Technology Development Program'],
  ['Humana', 'Healthcare', 'https://careers.humana.com', 'Technology Leadership Development Program'],
  ['Elevance Health', 'Healthcare', 'https://careers.elevancehealth.com', 'Technology Associate Program'],
  ['Johnson & Johnson', 'Healthcare', 'https://www.careers.jnj.com', 'Technology Leadership Development Program'],
  ['Medtronic', 'Healthcare', 'https://www.medtronic.com/careers', 'Engineering Leadership Development Program'],
  ['GE HealthCare', 'Healthcare', 'https://www.gehealthcare.com/careers', 'Edison Engineering Development Program'],
  ['Stryker', 'Healthcare', 'https://careers.stryker.com', 'Engineering Development Program'],
  // Retail
  ['Walmart', 'Retail', 'https://careers.walmart.com', 'Software Engineering Development Program'],
  ['The Home Depot', 'Retail', 'https://careers.homedepot.com', 'Technology Rotational Program'],
  ['Best Buy', 'Retail', 'https://jobs.bestbuy.com', 'Technology Development Program'],
  ['Kroger', 'Retail', 'https://jobs.kroger.com', 'Technology Leadership Program'],
  ['Costco Wholesale', 'Retail', 'https://www.costco.com/careers.html', 'IT Development Program'],
  ['TJX Companies', 'Retail', 'https://careers.tjx.com', 'Technology Development Program'],
  // Industrial / manufacturing
  ['General Electric', 'Industrial', 'https://www.ge.com/careers', 'Edison Engineering Development Program'],
  ['Honeywell', 'Industrial', 'https://careers.honeywell.com', 'Technology Leadership Program'],
  ['3M', 'Industrial', 'https://www.3m.com/3M/en_US/careers-us', 'Engineering Rotational Program'],
  ['John Deere', 'Industrial', 'https://www.deere.com/en/our-company/careers', 'Technology & Engineering Leadership Program'],
  ['Emerson Electric', 'Industrial', 'https://www.emerson.com/en-us/careers', 'Engineering Development Program'],
  ['Parker Hannifin', 'Industrial', 'https://www.parker.com/us/en/careers.html', 'Engineering Leadership Development Program'],
  ['Eaton Corporation', 'Industrial', 'https://www.eaton.com/us/en-us/company/careers.html', 'Engineering Leadership Development Program'],
  ['Rockwell Automation', 'Industrial', 'https://www.rockwellautomation.com/en-us/company/careers.html', 'Engineering Development Program'],
  // Aerospace / defense
  ['Boeing', 'Aerospace/Defense', 'https://jobs.boeing.com', 'Engineering Rotation Program'],
  ['Lockheed Martin', 'Aerospace/Defense', 'https://www.lockheedmartinjobs.com', 'Engineering Leadership Development Program'],
  ['General Dynamics', 'Aerospace/Defense', 'https://www.gd.com/careers', 'Engineering Development Program'],
  ['L3Harris Technologies', 'Aerospace/Defense', 'https://careers.l3harris.com', 'Engineering Rotational Program'],
  ['Textron', 'Aerospace/Defense', 'https://www.textron.com/careers', 'Engineering Development Program'],
  // Telecom
  ['Verizon', 'Telecom', 'https://www.verizon.com/about/careers', 'Technology Development Program'],
  ['T-Mobile', 'Telecom', 'https://www.t-mobile.com/careers', 'Technology Rotational Program'],
  ['Comcast', 'Telecom', 'https://jobs.comcast.com', 'Technology Development Program'],
  ['Charter Communications', 'Telecom', 'https://jobs.spectrum.com', 'Technology Development Program'],
  // Consulting
  ['Deloitte', 'Consulting', 'https://www2.deloitte.com/us/en/careers.html', 'Technology Consulting Rotation'],
  ['Accenture', 'Consulting', 'https://www.accenture.com/us-en/careers', 'Technology Development Program'],
  ['PwC', 'Consulting', 'https://www.pwc.com/us/en/careers.html', 'Technology Associate Program'],
  ['EY', 'Consulting', 'https://www.ey.com/en_us/careers', 'Technology Consulting Program'],
  ['KPMG', 'Consulting', 'https://www.kpmguscareers.com', 'Technology Development Program'],
  ['McKinsey & Company', 'Consulting', 'https://www.mckinsey.com/careers', 'Technology Fellow Program'],
  ['Capgemini', 'Consulting', 'https://www.capgemini.com/careers', 'Technology Development Program'],
  // Logistics
  ['UPS', 'Logistics', 'https://www.jobs-ups.com', 'Technology Development Program'],
  ['FedEx', 'Logistics', 'https://careers.fedex.com', 'Technology Rotational Program'],
  ['XPO', 'Logistics', 'https://jobs.xpo.com', 'Technology Development Program'],
  ['J.B. Hunt', 'Logistics', 'https://www.jbhunt.jobs', 'Technology Development Program'],
  // Energy
  ['ExxonMobil', 'Energy', 'https://corporate.exxonmobil.com/careers', 'Engineering Rotational Program'],
  ['Chevron', 'Energy', 'https://www.chevron.com/careers', 'Engineering Development Program'],
  ['ConocoPhillips', 'Energy', 'https://jobs.conocophillips.com', 'Engineering Rotational Program'],
  ['SLB (Schlumberger)', 'Energy', 'https://careers.slb.com', 'Engineering Development Program'],
  ['NextEra Energy', 'Energy', 'https://www.nexteraenergy.com/company/careers.html', 'Engineering Development Program'],
  ['Duke Energy', 'Energy', 'https://www.duke-energy.com/our-company/careers', 'Engineering Development Program'],
  ['Southern Company', 'Energy', 'https://careers.southerncompany.com', 'Engineering Rotational Program'],
  // Big tech / enterprise software (custom ATS)
  ['Google', 'Big Tech', 'https://careers.google.com', 'Software Engineer, New Grad'],
  ['Meta', 'Big Tech', 'https://www.metacareers.com', 'Software Engineer, University Grad'],
  ['Amazon', 'Big Tech', 'https://www.amazon.jobs', 'Software Development Engineer I'],
  ['Microsoft', 'Big Tech', 'https://careers.microsoft.com', 'Software Engineer, New Grad (MACH)'],
  ['Apple', 'Big Tech', 'https://jobs.apple.com', 'Software Engineer, New Grad'],
  ['Salesforce', 'SaaS', 'https://www.salesforce.com/company/careers', 'Software Engineer, New Grad'],
  ['Oracle', 'Enterprise Tech', 'https://www.oracle.com/careers', 'Software Developer, New Grad'],
  ['IBM', 'Enterprise Tech', 'https://www.ibm.com/careers', 'Early Professional Rotational Program'],
  ['Cisco', 'Networking', 'https://jobs.cisco.com', 'Engineering Leadership Development Program'],
  ['Adobe', 'SaaS', 'https://www.adobe.com/careers.html', 'Software Development Engineer, New College Grad'],
  ['Intel', 'Semiconductors', 'https://jobs.intel.com', 'Technology Rotation Program'],
  ['Qualcomm', 'Semiconductors', 'https://www.qualcomm.com/company/careers', 'Engineering Rotational Program'],
  ['NVIDIA', 'Semiconductors', 'https://www.nvidia.com/en-us/about-nvidia/careers', 'Software Engineer, New Grad'],
  ['SAP', 'Enterprise Tech', 'https://jobs.sap.com', 'Technology Associate Program'],
  ['ServiceNow', 'SaaS', 'https://careers.servicenow.com', 'Software Engineer, New Grad'],
  ['Intuit', 'Fintech', 'https://jobs.intuit.com', 'Software Engineer, New Grad'],
  ['eBay', 'E-commerce', 'https://careers.ebayinc.com', 'Software Engineer, New Grad'],
  ['Uber', 'Transportation Tech', 'https://www.uber.com/careers', 'Software Engineer, New Grad'],
]

// Workday tenant/site pairs. Unlike the ATS candidates above, Workday has
// no discoverable convention (tenant subdomain and internal "site" slug
// are assigned per-customer and aren't guessable), so each entry here was
// individually confirmed this session via a real POST to
// https://{tenant}.{wd}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs
// returning a non-error response with a real `total` count — not guessed.
// Workday's list endpoint doesn't include full descriptions, so these are
// classified on title only (see scripts/lib/adapters/workday.mjs).
const wd = (tenant, wdNum, site) => [{ adapter: 'workday', tenant, wd: wdNum, site }]

export const workdayCandidateCompanies = [
  ['Capital One', 'Finance', wd('capitalone', 'wd12', 'Capital_One')],
  ['Fidelity Investments', 'Finance', wd('fmr', 'wd1', 'FidelityCareers')],
  ['PNC Financial Services', 'Finance', wd('pnc', 'wd5', 'External')],
  ['U.S. Bank', 'Finance', wd('usbank', 'wd1', 'US_Bank_Careers')],
  ['Vanguard', 'Finance', wd('vanguard', 'wd5', 'vanguard_external')],
  ['Barclays', 'Finance', wd('barclays', 'wd3', 'External_Career_Site_Barclays')],
  ['Target', 'Retail', wd('target', 'wd5', 'targetcareers')],
  ['CVS Health', 'Healthcare', wd('cvshealth', 'wd1', 'CVS_Health_Careers')],
  ['Caterpillar', 'Industrial', wd('cat', 'wd5', 'CaterpillarCareers')],
  ['General Motors', 'Automotive', wd('generalmotors', 'wd5', 'Careers_GM')],
  ['RTX (Raytheon)', 'Aerospace/Defense', wd('globalhr', 'wd5', 'REC_RTX_Ext_Gateway')],
  ['Northrop Grumman', 'Aerospace/Defense', wd('ngc', 'wd1', 'Northrop_Grumman_External_Site')],
  ['Booz Allen Hamilton', 'Consulting', wd('bah', 'wd1', 'BAH_Jobs')],
  ['Wells Fargo', 'Finance', wd('wf', 'wd1', 'WellsFargoJobs')],
  ['USAA', 'Insurance', wd('usaa', 'wd1', 'USAAJOBSWD')],
  ['The Cigna Group', 'Healthcare', wd('cigna', 'wd5', 'cignacareers')],
  ['AT&T', 'Telecom', wd('att', 'wd1', 'ATTCollege')],
  ["Lowe's", 'Retail', wd('lowes', 'wd5', 'LWS_External_CS')],
  ['State Street', 'Finance', wd('statestreet', 'wd1', 'Global')],
  ['Raymond James', 'Finance', wd('raymondjames', 'wd1', 'RaymondJamesCareers')],
]
