# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Do deep research 
- Work on one file at a time
- Make one change, test and verify that change
- Use git so that you can make breaking changes and then roll them back if it doesn't work
- No hardcoding, no static brittle references
- Use ESM and always use the latest, recommended techniques to keep ESM as simple as possible. Never hardcode anything.
- To create a shared schema between client and server, use a shared schema as a node module that can be accessed by client and server
- Use CDK
- Use lambdas
- Use Node v22 and AWS SDK v3
- Use environment variables
- Use a Data Access Layer pattern
- Create and maintain a shared data access layer service for client and server 
- Never handcode anything for http or JSON, use an http client and JSON libray
- Use functional programming idioms
- Scope try-catch blocks to be as small as possible
- Use a lint file to enforce code complexity warnings (avoid excessive indents etc)
- Use SOLID design patterns
- Keep concerns separate
- Use CDK constructs
- Keep code DRY
- Minimal conditional logic, avoid complext if/else chains
- Functional over procedural for example prefer map/filter/reduce over loops
- lodash fp is a good library to use, make sure you curry and do the functional things for highly fluent readable composable code
- keep methods and functions short and unit testable
- always write unit tests and run the test suite after every change
- always git commit after each incremental completion of something that works
- Use the JS equivalent of JavaDoc to comment and document everything you do
- Throw clear hard errors that crash the system
- Never let compilation failures linger and stop what you're doing and fix hard errors as soon as they come up
- Always present a plan and don't make big changes without a plan to review 
- Use Zod schemas for runtime validation
- Include context for debugging in error messages
- Use Zod for all validation e.g. input/output

> **There must be one and only one definition for all wire protocols, persistence schemas, interfaces, and APIs. These definitions must be shared between client and server.**

### What This Means

- ✅ **Single Source of Truth**: Every data structure has exactly one canonical definition
- ✅ **Shared Validation**: Client and server use identical validation rules
- ✅ **No Duplication**: Never define the same schema in multiple places
- ✅ **No Drift**: Schema changes automatically propagate to all consumers
- ✅ **Type Safety**: Full TypeScript support across the entire stack

### What This Prevents

- ❌ **Schema Drift**: Client and server getting out of sync
- ❌ **Validation Inconsistencies**: Different rules on client vs server
- ❌ **Runtime Errors**: Type mismatches causing production failures
- ❌ **Duplicate Maintenance**: Updating schemas in multiple places
- ❌ **Integration Issues**: API contracts changing without notice
