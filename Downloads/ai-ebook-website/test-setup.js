#!/usr/bin/env node

// Simple test script to verify environment setup
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 AI Ebook Website Setup Test\n');

// Check if required files exist
const requiredFiles = [
  'package.json',
  'src/App.jsx',
  'src/components/HomePage.jsx',
  'src/components/CheckoutPage.jsx',
  'src/components/SuccessPage.jsx',
  'api/create-checkout-session.js',
  'api/get-download-link.js',
  'api/stripe-webhook.js',
  'vercel.json',
  '.env.example'
];

console.log('📁 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(path.join(__dirname, file))) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredDeps = [
  'react',
  'react-dom',
  'react-router-dom',
  '@stripe/stripe-js',
  '@supabase/supabase-js',
  'framer-motion',
  'lucide-react',
  'stripe',
  '@sendgrid/mail'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}`);
  } else {
    console.log(`❌ ${dep} - MISSING`);
    allFilesExist = false;
  }
});

// Check environment variables template
console.log('\n🔧 Environment variables template:');
if (fs.existsSync('.env.example')) {
  const envExample = fs.readFileSync('.env.example', 'utf8');
  const requiredEnvVars = [
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SENDGRID_API_KEY',
    'VITE_STRIPE_PUBLISHABLE_KEY'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (envExample.includes(envVar)) {
      console.log(`✅ ${envVar}`);
    } else {
      console.log(`❌ ${envVar} - MISSING`);
    }
  });
}

console.log('\n📋 Next Steps:');
console.log('1. Copy .env.example to .env.local');
console.log('2. Fill in your API keys in .env.local');
console.log('3. Run: npm install');
console.log('4. Run: npm run dev');
console.log('5. Test locally before deploying');
console.log('6. Deploy to Vercel');

if (allFilesExist) {
  console.log('\n🎉 Setup looks good! Ready for configuration and deployment.');
} else {
  console.log('\n⚠️  Some files are missing. Please check the setup.');
}

console.log('\n📧 Support: chris.t@ventarosales.com');

