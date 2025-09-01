require('dotenv').config({ path: '.env' });

console.log(`Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
console.log(`Private Key is set: ${!!process.env.FIREBASE_PRIVATE_KEY}`);

if (!process.env.FIREBASE_PRIVATE_KEY) {
  console.error('Error: FIREBASE_PRIVATE_KEY was not loaded.');
  process.exit(1);
}

console.log('Success: Environment variables appear to be loaded correctly.');
