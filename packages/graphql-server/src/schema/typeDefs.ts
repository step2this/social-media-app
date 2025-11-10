import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read schema from project root (../../../../ from src/schema/)
const schemaPath = join(__dirname, '../../../../schema.graphql');
export const typeDefs = readFileSync(schemaPath, 'utf-8');
