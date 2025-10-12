# DynamoDB GSI Allocation Strategy

## Purpose
This document defines the consistent pattern for Global Secondary Index (GSI) usage across all entities in the TamaFriends single-table design.

## GSI Allocation Rules

### GSI1: Entity-Specific Reverse Lookups
**Purpose:** Query entities by their unique identifier or target entity

| Entity | GSI1PK | GSI1SK | Use Case |
|--------|--------|--------|----------|
| USER_PROFILE | `EMAIL#<email>` | `USER#<userId>` | Login by email |
| POST | `POST#<postId>` | `USER#<userId>` | Get post by ID |
| FOLLOW | `USER#<followeeId>` | `FOLLOWER#<followerId>` | Get user's followers |
| COMMENT | `COMMENT#<commentId>` | `POST#<postId>` | Get comment by ID |
| LIKE | N/A | N/A | Not used |

### GSI2: User-Centric Queries
**Purpose:** Query entities by user who created/owns them

| Entity | GSI2PK | GSI2SK | Use Case |
|--------|--------|--------|----------|
| USER_PROFILE | `USERNAME#<username>` | `USER#<userId>` | Login by username |
| POST | N/A | N/A | Not needed (PK is userId) |
| FOLLOW | `USER#<followeeId>` | `FOLLOW#<followerId>` | Stream processor lookup |
| COMMENT | `USER#<userId>` | `COMMENT#<timestamp>#<id>` | User's comments |
| LIKE | `USER#<userId>` | `LIKE#<postId>` | User's liked posts |

### GSI3: Alternative Identifiers
**Purpose:** Lookup by friendly/public identifiers

| Entity | GSI3PK | GSI3SK | Use Case |
|--------|--------|--------|----------|
| USER_PROFILE | `HANDLE#<handle>` | `USER#<userId>` | Profile by @handle |
| Others | N/A | N/A | Not used |

## Design Principles

1. **Sparse Indexes**: Only define GSI fields when needed
2. **Consistency**: Follow patterns across similar entities
3. **Stream Processor Support**: GSI2 provides metadata for counter updates
4. **Query Efficiency**: Each GSI serves a specific, documented query pattern

## Adding New Entities

When creating a new entity:
1. Determine primary access pattern → Use PK/SK
2. Need reverse lookup by ID? → Use GSI1
3. Need user-owned queries? → Use GSI2
4. Need alternative identifier? → Use GSI3
5. Document pattern in this file

## Stream Processor Pattern

All stream processors that update counters follow this pattern:

### For User-Content Relationships (LIKE, COMMENT)
- Embed metadata in entity: `postUserId`, `postSK`
- Stream processor reads metadata from entity
- Updates target post entity directly

### For User-User Relationships (FOLLOW)
- Use GSI2PK to store target user: `USER#<followeeId>`
- Stream processor reads `GSI2PK` to find target
- Updates both follower and followee profile entities

## References
- Entity Definitions: `/packages/dal/src/entities/`
- Services: `/packages/dal/src/services/`
- Stream Processors: `/packages/backend/src/handlers/streams/`

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-11 | Claude Code | Initial documentation after GSI2 bug fix |
