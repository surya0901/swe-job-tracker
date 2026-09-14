// A curated list of common software-engineering skills/tools/concepts used
// for local keyword matching. Not exhaustive, not AI — a deterministic
// dictionary lookup against the text the user actually pasted in.
export const SKILLS_DICTIONARY = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang',
  'Rust', 'Kotlin', 'Swift', 'Ruby', 'PHP', 'Scala', 'SQL', 'NoSQL',
  'React', 'React Native', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Node.js',
  'Express', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  '.NET', 'Rails', 'GraphQL', 'REST', 'gRPC', 'Protobuf', 'WebSockets',
  'Microservices', 'Distributed Systems', 'System Design',
  'Kubernetes', 'Docker', 'Terraform', 'Ansible', 'CI/CD', 'Jenkins',
  'GitHub Actions', 'AWS', 'Azure', 'GCP', 'Google Cloud',
  'Lambda', 'S3', 'EC2', 'DynamoDB', 'PostgreSQL', 'MySQL', 'MongoDB',
  'Redis', 'Kafka', 'RabbitMQ', 'Elasticsearch', 'Spark', 'Hadoop',
  'Airflow', 'ETL', 'Data Pipeline', 'Machine Learning', 'Deep Learning',
  'PyTorch', 'TensorFlow', 'NLP', 'LLM', 'A/B Testing', 'Unit Testing',
  'Integration Testing', 'TDD', 'Jest', 'Pytest', 'Selenium', 'Cypress',
  'Agile', 'Scrum', 'Git', 'Linux', 'Bash', 'Shell Scripting',
  'Object-Oriented Design', 'Data Structures', 'Algorithms',
  'Load Balancing', 'Caching', 'Message Queues', 'OAuth', 'SSO',
  'Security', 'Accessibility', 'Performance Optimization', 'Observability',
  'Monitoring', 'Grafana', 'Prometheus', 'Datadog', 'Figma', 'CSS',
  'HTML', 'Tailwind', 'Webpack', 'Vite', 'Mobile Development', 'iOS',
  'Android', 'Cross-functional Collaboration', 'Mentorship',
]

export function extractMatches(text) {
  const found = new Set()
  for (const skill of SKILLS_DICTIONARY) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i')
    if (pattern.test(text)) found.add(skill)
  }
  return found
}
