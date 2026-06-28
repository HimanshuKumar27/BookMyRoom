import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFilePath = path.join(__dirname, '../js/env.js');

const fileExists = fs.existsSync(envFilePath);
const hasEnvVars = !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

if (!hasEnvVars && fileExists) {
  console.log('js/env.js already exists and no system environment variables were detected. Skipping generation.');
  process.exit(0);
}

const content = `// Generated at build time
export const ENV = {
  SUPABASE_URL: '${process.env.SUPABASE_URL || 'your_supabase_project_url'}',
  SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key'}',
  EMAILJS_PUBLIC_KEY: '${process.env.EMAILJS_PUBLIC_KEY || 'your_emailjs_public_key'}',
  EMAILJS_SERVICE_ID: '${process.env.EMAILJS_SERVICE_ID || 'your_emailjs_service_id'}',
  EMAILJS_TEMPLATE_ID: '${process.env.EMAILJS_TEMPLATE_ID || 'your_emailjs_template_id'}',
  ADMIN_EMAIL: '${process.env.ADMIN_EMAIL || 'your_admin_email@example.com'}',
};
`;

try {
  fs.writeFileSync(envFilePath, content);
  console.log('✓ Successfully generated js/env.js.');
} catch (e) {
  console.error('Failed to generate js/env.js:', e);
  process.exit(1);
}
