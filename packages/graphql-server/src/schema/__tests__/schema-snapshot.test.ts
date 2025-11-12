/**
 * GraphQL Schema Snapshot Tests
 *
 * Testing Principles:
 * ✅ Breaking change detection - schema changes trigger test failures
 * ✅ Version control - snapshots are committed to git
 * ✅ Type safety - validates schema includes required types
 * ✅ CI/CD integration - prevents accidental breaking changes
 *
 * What we're testing:
 * - Schema structure remains consistent (snapshot)
 * - Required root types exist (Query, Mutation)
 * - Core domain types exist (User, Post, Comment, etc.)
 * - Schema is valid GraphQL
 *
 * Why this matters:
 * - Catches accidental breaking changes before they reach production
 * - Documents schema evolution over time
 * - Provides confidence when refactoring
 *
 * Note on GraphQL Module Realm Issue:
 * We avoid using printSchema() and validateSchema() directly to prevent
 * "Cannot use GraphQLSchema from another module or realm" errors.
 * Instead, we snapshot the schema structure as a plain object and rely on
 * Apollo Server for runtime validation.
 */

import { describe, it, expect } from 'vitest';
import { pothosSchema } from '../pothos/index.js';

describe('GraphQL Schema Snapshot', () => {
  it('schema type structure matches snapshot (breaking change detection)', () => {
    // ACT - Get all type names and their fields
    const typeMap = pothosSchema.getTypeMap();
    
    // Build a serializable representation of the schema structure
    const schemaStructure: Record<string, {
      fields: string[];
      kind: string;
    }> = {};
    
    for (const [typeName, type] of Object.entries(typeMap)) {
      // Skip internal GraphQL types
      if (typeName.startsWith('__')) continue;
      
      const entry = {
        fields: [] as string[],
        kind: type.constructor.name,
      };
      
      // Get fields if the type has them (Object types)
      if ('getFields' in type && typeof type.getFields === 'function') {
        const fields = type.getFields();
        entry.fields = Object.keys(fields).sort();
      }
      
      // Get values if it's an enum
      if ('getValues' in type && typeof type.getValues === 'function') {
        const values = type.getValues();
        entry.fields = values.map((v: any) => v.name).sort();
      }
      
      schemaStructure[typeName] = entry;
    }
    
    // ASSERT - Schema structure matches snapshot
    // If this fails, you've changed the schema structure
    // Review the changes carefully before updating the snapshot with -u flag
    // Example: pnpm test -- src/schema/__tests__/schema-snapshot.test.ts -u
    expect(schemaStructure).toMatchSnapshot();
  });

  it('includes all required root types', () => {
    // ACT
    const typeMap = pothosSchema.getTypeMap();
    
    // ASSERT - Behavior: Core root types exist
    expect(typeMap).toHaveProperty('Query');
    expect(typeMap).toHaveProperty('Mutation');
    
    // Verify schema has these root types configured
    expect(pothosSchema.getQueryType()).toBeDefined();
    expect(pothosSchema.getMutationType()).toBeDefined();
    
    // Verify Query type has expected core fields
    const queryType = typeMap['Query'];
    const queryFields = (queryType as any).getFields();
    expect(queryFields).toHaveProperty('me');
    expect(queryFields).toHaveProperty('profile');
    expect(queryFields).toHaveProperty('post');
    expect(queryFields).toHaveProperty('feed');
    
    // Verify Mutation type has expected core fields
    const mutationType = typeMap['Mutation'];
    const mutationFields = (mutationType as any).getFields();
    expect(mutationFields).toHaveProperty('register');
    expect(mutationFields).toHaveProperty('login');
    expect(mutationFields).toHaveProperty('createPost');
    expect(mutationFields).toHaveProperty('likePost');
  });

  it('includes all core domain types', () => {
    // ACT
    const typeMap = pothosSchema.getTypeMap();
    
    // ASSERT - Behavior: All domain types are present
    // User & Profile types
    expect(typeMap).toHaveProperty('Profile');
    expect(typeMap).toHaveProperty('PublicProfile');
    
    // Content types
    expect(typeMap).toHaveProperty('Post');
    expect(typeMap).toHaveProperty('Comment');
    
    // Interaction types
    expect(typeMap).toHaveProperty('LikeStatus');
    expect(typeMap).toHaveProperty('LikeResponse');
    expect(typeMap).toHaveProperty('FollowStatus');
    expect(typeMap).toHaveProperty('FollowResponse');
    
    // Feed types
    expect(typeMap).toHaveProperty('FeedItem');
    expect(typeMap).toHaveProperty('FeedConnection');
    expect(typeMap).toHaveProperty('FeedEdge');
    
    // Pagination types
    expect(typeMap).toHaveProperty('PageInfo');
    expect(typeMap).toHaveProperty('PostConnection');
    expect(typeMap).toHaveProperty('PostEdge');
    expect(typeMap).toHaveProperty('CommentConnection');
    expect(typeMap).toHaveProperty('CommentEdge');
    
    // Auth types
    expect(typeMap).toHaveProperty('AuthPayload');
    expect(typeMap).toHaveProperty('AuthTokens');
    
    // Notification types
    expect(typeMap).toHaveProperty('Notification');
    expect(typeMap).toHaveProperty('NotificationConnection');
  });

  it('has expected number of custom types', () => {
    // ACT
    const typeMap = pothosSchema.getTypeMap();
    
    // Filter out built-in GraphQL types (start with __)
    const customTypes = Object.keys(typeMap).filter(
      name => !name.startsWith('__')
    );
    
    // ASSERT - Behavior: Schema has reasonable complexity
    // If this number changes significantly, review what types were added/removed
    expect(customTypes.length).toBeGreaterThan(30); // At least 30 custom types
    expect(customTypes.length).toBeLessThan(100);   // Not more than 100 types
    
    // Helpful debug output if test fails
    if (customTypes.length <= 30 || customTypes.length >= 100) {
      console.log('Custom types count:', customTypes.length);
      console.log('Custom types:', customTypes.sort());
    }
  });

  it('Query type has expected field count', () => {
    // ACT
    const typeMap = pothosSchema.getTypeMap();
    const queryType = typeMap['Query'];
    const queryFields = (queryType as any).getFields();
    const fieldNames = Object.keys(queryFields);
    
    // ASSERT - Behavior: Query has a reasonable number of root fields
    // Too many root fields suggests poor API design
    // Too few suggests missing functionality
    expect(fieldNames.length).toBeGreaterThan(5);   // At least 5 queries
    expect(fieldNames.length).toBeLessThan(50);     // Not more than 50 queries
  });

  it('Mutation type has expected field count', () => {
    // ACT
    const typeMap = pothosSchema.getTypeMap();
    const mutationType = typeMap['Mutation'];
    const mutationFields = (mutationType as any).getFields();
    const fieldNames = Object.keys(mutationFields);
    
    // ASSERT - Behavior: Mutation has a reasonable number of operations
    expect(fieldNames.length).toBeGreaterThan(5);   // At least 5 mutations
    expect(fieldNames.length).toBeLessThan(50);     // Not more than 50 mutations
  });

  it('connection types follow Relay cursor pagination spec', () => {
    // ACT
    const typeMap = pothosSchema.getTypeMap();
    
    // Check that connection types have required Relay fields
    const connectionTypes = ['PostConnection', 'CommentConnection', 'FeedConnection', 'NotificationConnection'];
    
    for (const typeName of connectionTypes) {
      const type = typeMap[typeName];
      
      // Skip if type doesn't exist (might be optional)
      if (!type) continue;
      
      // Only check if type has getFields method
      if (!('getFields' in type) || typeof type.getFields !== 'function') continue;
      
      const fields = type.getFields();
      
      // Relay spec requires: edges and pageInfo
      expect(fields).toHaveProperty('edges');
      expect(fields).toHaveProperty('pageInfo');
    }
    
    // Check that edge types have required Relay fields
    const edgeTypes = ['PostEdge', 'CommentEdge', 'FeedEdge', 'NotificationEdge'];
    
    for (const typeName of edgeTypes) {
      const type = typeMap[typeName];
      
      // Skip if type doesn't exist
      if (!type) continue;
      
      // Only check if type has getFields method
      if (!('getFields' in type) || typeof type.getFields !== 'function') continue;
      
      const fields = type.getFields();
      
      // Relay spec requires: node and cursor
      expect(fields).toHaveProperty('node');
      expect(fields).toHaveProperty('cursor');
    }
    
    // Check PageInfo has required fields
    const pageInfoType = typeMap['PageInfo'];
    expect(pageInfoType).toBeDefined();
    
    if (pageInfoType && 'getFields' in pageInfoType && typeof pageInfoType.getFields === 'function') {
      const pageInfoFields = pageInfoType.getFields();
      expect(pageInfoFields).toHaveProperty('hasNextPage');
      expect(pageInfoFields).toHaveProperty('hasPreviousPage');
      expect(pageInfoFields).toHaveProperty('startCursor');
      expect(pageInfoFields).toHaveProperty('endCursor');
    }
  });
});