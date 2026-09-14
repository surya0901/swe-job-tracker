// Mock seed data. Replace/extend this list with your own target companies,
// or drop a scraped/exported JSON array shaped like this into the app via
// the "Refresh Openings" flow (see src/lib/refreshOpenings.js).
export const STATUSES = [
  'To Apply',
  'Applied',
  'OA',
  'Interview',
  'Offer',
  'Rejected',
]

export const PROGRAM_TYPES = ['Rotational', 'Standard']

let _id = 1
const nextId = () => `co-${_id++}`

const c = (fields) => ({
  id: nextId(),
  status: 'To Apply',
  notes: '',
  url: '',
  dateAdded: new Date().toISOString().slice(0, 10),
  ...fields,
})

export const seedCompanies = [
  c({ name: 'Capital One', programName: 'Technology Development Program (TDP)', industry: 'Finance', programType: 'Rotational', location: 'McLean, VA' }),
  c({ name: 'JPMorgan Chase', programName: 'Software Engineer Program (LDP)', industry: 'Finance', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Goldman Sachs', programName: 'New Analyst Program', industry: 'Finance', programType: 'Rotational', location: 'New York, NY' }),
  c({ name: 'American Express', programName: 'Technology Rotation Program', industry: 'Finance', programType: 'Rotational', location: 'New York, NY' }),
  c({ name: 'Fidelity Investments', programName: 'Technology Leadership Program', industry: 'Finance', programType: 'Rotational', location: 'Boston, MA' }),
  c({ name: 'USAA', programName: 'Technology Development Program', industry: 'Insurance', programType: 'Rotational', location: 'San Antonio, TX' }),
  c({ name: 'IBM', programName: 'Early Professional Rotational Program', industry: 'Enterprise Tech', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Cisco', programName: 'Engineering Leadership Development (ELDP)', industry: 'Networking', programType: 'Rotational', location: 'San Jose, CA' }),
  c({ name: 'General Electric', programName: 'Edison Engineering Development Program', industry: 'Industrial', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Raytheon (RTX)', programName: 'Engineering Rotational Program', industry: 'Aerospace/Defense', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Northrop Grumman', programName: 'Engineering & Technology Rotation Program', industry: 'Aerospace/Defense', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'John Deere', programName: 'Technology & Engineering Leadership Program', industry: 'Industrial', programType: 'Rotational', location: 'Moline, IL' }),
  c({ name: 'Target', programName: 'Technology Rotational Development Program', industry: 'Retail', programType: 'Rotational', location: 'Minneapolis, MN' }),
  c({ name: "Lowe's", programName: 'Technology Development Program', industry: 'Retail', programType: 'Rotational', location: 'Charlotte, NC' }),
  c({ name: 'PepsiCo', programName: 'Technology Leadership Program', industry: 'Consumer Goods', programType: 'Rotational', location: 'Purchase, NY' }),
  c({ name: 'Verizon', programName: 'Technology Development Program', industry: 'Telecom', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Deloitte', programName: 'Technology Consulting Rotation', industry: 'Consulting', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Accenture', programName: 'Technology Development Program', industry: 'Consulting', programType: 'Rotational', location: 'Multiple US' }),
  c({ name: 'Google', programName: 'Software Engineer, New Grad', industry: 'Big Tech', programType: 'Standard', location: 'Multiple US' }),
  c({ name: 'Meta', programName: 'Software Engineer, University Grad', industry: 'Big Tech', programType: 'Standard', location: 'Menlo Park, CA' }),
  c({ name: 'Amazon', programName: 'Software Development Engineer I', industry: 'Big Tech', programType: 'Standard', location: 'Seattle, WA' }),
  c({ name: 'Microsoft', programName: 'Software Engineer, New Grad (MACH)', industry: 'Big Tech', programType: 'Standard', location: 'Redmond, WA' }),
  c({ name: 'Salesforce', programName: 'Software Engineer, New Grad', industry: 'SaaS', programType: 'Standard', location: 'San Francisco, CA' }),
  c({ name: 'Adobe', programName: 'Software Development Engineer, New College Grad', industry: 'SaaS', programType: 'Standard', location: 'San Jose, CA' }),
  c({ name: 'Oracle', programName: 'Software Developer, New Grad', industry: 'Enterprise Tech', programType: 'Standard', location: 'Austin, TX' }),
]
