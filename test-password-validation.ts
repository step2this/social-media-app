#!/usr/bin/env tsx

/**
 * Quick test to verify password validation is working correctly
 * Run: tsx test-password-validation.ts
 */

import { PasswordSchema, RegisterRequestSchema } from './packages/shared/src/schemas/auth.schema.js';

console.log('🧪 Testing Password Validation\n');

// Test 1: Invalid password (no uppercase, no special char)
console.log('Test 1: "password123" (should FAIL)');
const test1 = PasswordSchema.safeParse('password123');
console.log(`Result: ${test1.success ? '✅ PASS' : '❌ FAIL'}`);
if (!test1.success) {
  console.log('Errors:', test1.error.errors.map(e => e.message));
}
console.log('');

// Test 2: Valid password
console.log('Test 2: "Password123!" (should PASS)');
const test2 = PasswordSchema.safeParse('Password123!');
console.log(`Result: ${test2.success ? '✅ PASS' : '❌ FAIL'}`);
if (!test2.success) {
  console.log('Errors:', test2.error.errors.map(e => e.message));
}
console.log('');

// Test 3: Full registration request
console.log('Test 3: Full registration request with "Password123!"');
const test3 = RegisterRequestSchema.safeParse({
  email: 'test@example.com',
  password: 'Password123!',
  username: 'testuser'
});
console.log(`Result: ${test3.success ? '✅ PASS' : '❌ FAIL'}`);
if (!test3.success) {
  console.log('Errors:', test3.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
}
if (test3.success) {
  console.log('Validated data:', test3.data);
}
