# Project Context System
**Social Media App - Agent Coordination & Knowledge Management**

---

## Overview

This directory contains comprehensive context documentation for the Social Media App project. These documents enable efficient agent coordination, context preservation across sessions, and rapid onboarding for new agents.

---

## Document Structure

### 1. `project-context.md` - **PRIMARY CONTEXT DOCUMENT**
**Purpose**: Comprehensive project state and historical context

**Read this when**:
- Starting a new agent session
- Need to understand project architecture
- Looking for design decisions and rationale
- Need complete feature history
- Planning major changes

**Contains**:
- Project overview and goals
- Technology stack details
- Current implementation state
- Recent work and changes
- Design decisions and rationale
- Code patterns and conventions
- Agent coordination history
- Future roadmap
- Technical debt tracking
- Operational guidelines

**Update frequency**: After each major feature completion

---

### 2. `agent-playbook.md` - **TACTICAL EXECUTION GUIDE**
**Purpose**: Quick-reference workflows and problem-solving patterns

**Read this when**:
- Starting a specific task
- Encountering common problems
- Need step-by-step workflow
- Debugging issues
- Coordinating with other agents

**Contains**:
- Quick start scenarios
- Agent role definitions
- Common task workflows
- Troubleshooting guides
- Communication protocols
- Emergency recovery procedures
- Command quick reference

**Update frequency**: When new patterns or solutions are discovered

---

### 3. `knowledge-graph.json` - **SEMANTIC RELATIONSHIPS**
**Purpose**: Structured knowledge graph of project entities and relationships

**Read this when**:
- Need to understand entity relationships
- Looking for cross-references
- Analyzing dependencies
- Planning architectural changes

**Contains**:
- Entity definitions (features, components, services)
- Relationships and dependencies
- Semantic links
- Metadata and tags

**Update frequency**: When new entities or relationships are added

---

## Quick Start Guide

### For New Agent Sessions

**Step 1: Context Restoration** (2-3 minutes)
```bash
# Read the primary context document
cat /Users/shaperosteve/social-media-app/.context/project-context.md

# Check current state
git status
git log --oneline -10
pnpm servers:status
```

**Step 2: Find Your Scenario** (1 minute)
```bash
# Read the relevant section of the playbook
cat /Users/shaperosteve/social-media-app/.context/agent-playbook.md
# Search for your specific scenario
```

**Step 3: Execute** (varies)
```bash
# Follow the workflow from the playbook
# Update context documents as needed
```

---

### For Specific Tasks

#### Continuing Previous Work
1. Read `project-context.md` Section 2.1 "Recently Implemented Features"
2. Check git status for uncommitted changes
3. Review relevant test results
4. Follow continuation workflow in playbook

#### Adding New Feature
1. Read `project-context.md` Section 3 "Design Decisions" for patterns
2. Follow TDD workflow in `agent-playbook.md`
3. Update context with new feature details

#### Debugging Issues
1. Check `agent-playbook.md` Troubleshooting Guide
2. Review relevant code patterns in `project-context.md`
3. Document solution for future agents

#### Infrastructure Changes
1. Review current architecture in `project-context.md`
2. Follow infrastructure workflow in playbook
3. Document decisions and rationale

---

## Context Maintenance

### When to Update Context Documents

**Update `project-context.md` when**:
- ✅ Major feature completed
- ✅ Architecture decision made
- ✅ New design pattern established
- ✅ Technical debt identified
- ✅ Significant blocker resolved
- ✅ Dependency or technology changed

**Update `agent-playbook.md` when**:
- ✅ New workflow discovered
- ✅ Better solution to common problem found
- ✅ New troubleshooting pattern identified
- ✅ Agent role pattern emerges
- ✅ Emergency recovery procedure changes

**Update both when**:
- ✅ Major project milestone reached
- ✅ Team conventions change
- ✅ Development process evolves

### How to Update

**Minor Updates** (quick fixes, clarifications):
```bash
# Edit directly
# Update "Last Updated" date
# No version bump needed
```

**Major Updates** (new sections, structural changes):
```bash
# Edit document
# Bump version number
# Update change log
# Add to git commit message
```

---

## Context Quality Standards

### Documentation Principles

1. **Clarity**: Write for someone with no prior context
2. **Completeness**: Include all essential information
3. **Currency**: Keep information up-to-date
4. **Conciseness**: Be thorough but not verbose
5. **Actionability**: Provide clear next steps
6. **Searchability**: Use consistent terminology
7. **Examples**: Include code examples where helpful

### Structure Requirements

- **Consistent Formatting**: Use markdown properly
- **Clear Headings**: Hierarchical and descriptive
- **Code Blocks**: Always include language tags
- **Lists**: Use bullets for items, numbers for sequences
- **Links**: Reference related sections and files
- **Metadata**: Maintain version info and dates

### Content Requirements

- **Context First**: Explain why before how
- **Assumptions Explicit**: State prerequisites clearly
- **Errors Documented**: Include common pitfalls
- **Success Criteria**: Define what "done" looks like
- **Trade-offs Noted**: Explain decision rationale

---

## Context Restoration Checklist

When starting a new session, complete this checklist:

### Environment Verification
- [ ] Read `project-context.md` thoroughly
- [ ] Review `agent-playbook.md` for relevant scenario
- [ ] Check git status and recent commits
- [ ] Verify server state: `pnpm servers:status`
- [ ] Review recent test results
- [ ] Check for uncommitted changes

### Orientation Questions
- [ ] What was the last completed feature?
- [ ] Are there any failing tests?
- [ ] Are there any known blockers?
- [ ] What is the next planned work?
- [ ] Are servers running properly?

### Preparation Steps
- [ ] Ensure clean server state
- [ ] Run baseline tests
- [ ] Review relevant code sections
- [ ] Create task plan
- [ ] Update context if needed

---

## Integration with Development Workflow

### Git Integration

**Context in Commits**:
```bash
git commit -m "feat: Add new feature

Context: Continuing notification system work
Previous: Notification creation in handlers
This commit: Integration test verification

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Context in Branches**:
- Branch names should reflect feature from context
- PR descriptions should link to context decisions

### Testing Integration

**Test Context**:
- Integration tests document expected behavior
- Test names should match context terminology
- Test results inform context updates

### Documentation Integration

**Cross-References**:
- CLAUDE.md provides development guidelines
- .context/ provides project state and history
- README.md provides project overview
- Code comments provide implementation details

---

## Advanced Context Patterns

### Context Versioning

**Version Format**: `MAJOR.MINOR`
- **MAJOR**: Significant structural changes, new sections
- **MINOR**: Updates to existing content, clarifications

**Example**:
- v1.0: Initial context document
- v1.1: Added troubleshooting section
- v2.0: Restructured with new architecture

### Context Compression

**When context grows too large**:
1. Archive historical sections to separate files
2. Create executive summaries
3. Use knowledge graph for relationships
4. Link to detailed documents

### Multi-Agent Coordination

**Context Handoff**:
```markdown
## Agent Handoff Log

### 2025-10-12 14:30 - Backend Agent -> Testing Agent
**Completed**: Notification handler implementation
**Status**: Code complete, needs verification
**Next Steps**: Run integration tests to verify
**Files Changed**:
- packages/backend/src/handlers/likes/like-post.ts
- packages/backend/src/handlers/comments/create-comment.ts
**Context**: See project-context.md Section 2.1
```

---

## Context System Metrics

### Success Indicators

**Effective context system shows**:
- ✅ Faster agent onboarding (< 5 minutes)
- ✅ Fewer duplicate questions
- ✅ Consistent code patterns
- ✅ Smooth agent handoffs
- ✅ Accurate mental models
- ✅ Reduced rework

### Quality Metrics

**Monitor these indicators**:
- Time to understand project state
- Accuracy of agent decisions
- Consistency with established patterns
- Frequency of context updates
- Agent confusion or errors

---

## Troubleshooting Context System

### Problem: Context Out of Date
**Symptoms**: Information doesn't match reality

**Solution**:
1. Review git log for recent changes
2. Update context documents
3. Bump version numbers
4. Add to change log

---

### Problem: Context Too Detailed
**Symptoms**: Hard to find relevant information

**Solution**:
1. Create executive summaries
2. Improve table of contents
3. Add quick reference sections
4. Archive historical details

---

### Problem: Context Gaps
**Symptoms**: Missing critical information

**Solution**:
1. Identify what's missing
2. Research current state
3. Document findings
4. Add to appropriate document

---

## Related Resources

### Primary Documents
- `/CLAUDE.md` - Development guidelines and conventions
- `/README.md` - Project overview (if exists)
- `.context/project-context.md` - Comprehensive state
- `.context/agent-playbook.md` - Tactical workflows

### Code Documentation
- JSDoc comments in source files
- Test files as behavior documentation
- Schema definitions as contract documentation

### External Resources
- Git commit history
- Pull request descriptions
- Issue tracker (if exists)

---

## Future Enhancements

### Planned Improvements
- [ ] Automated context extraction from git history
- [ ] Context search functionality
- [ ] Visual architecture diagrams
- [ ] Interactive knowledge graph browser
- [ ] Automated staleness detection
- [ ] Context diff viewer
- [ ] Agent performance analytics

### Experimental Features
- [ ] AI-powered context summarization
- [ ] Context recommendation engine
- [ ] Predictive context loading
- [ ] Multi-modal context (diagrams, videos)

---

## Contact and Contribution

### Maintaining This System

**Responsibilities**:
- All agents contribute to context quality
- Lead agent (if exists) ensures consistency
- Regular reviews for accuracy and completeness

**Best Practices**:
- Update context immediately after significant changes
- Review context before major decisions
- Improve documentation when gaps found
- Share learnings across agents

---

## Quick Command Reference

### Reading Context
```bash
# Full context read
cat .context/project-context.md

# Quick reference
cat .context/agent-playbook.md

# Search for specific topic
grep -r "notification" .context/

# View recent updates (git)
git log --oneline .context/
```

### Updating Context
```bash
# Edit context (preferred)
# Use your editor to update

# View changes
git diff .context/

# Commit context updates
git add .context/
git commit -m "docs: Update project context with [feature]"
```

---

## End of README

This context system is designed to evolve with the project. Keep it current, keep it clear, keep it useful.

**Remember**: Good context is the foundation of effective agent coordination.

**Last Updated**: 2025-10-12
**System Version**: 1.0
**Maintainer**: All agents (collective responsibility)
