import dotenv from 'dotenv';

// Load local secrets before Firebase Admin is imported and initialized.
// Production deployments continue to use their injected environment variables.
dotenv.config({ path: ['.env.local', '.env'] });
