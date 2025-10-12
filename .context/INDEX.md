# Context System Index
**Quick Navigation for Social Media App Context**

---

## 📁 Directory Structure

```
.context/
├── README.md                      # How to use this context system
├── INDEX.md                       # This file - navigation guide
├── CONTEXT-SYSTEM-SUMMARY.md      # Overview and usage guide
├── CURRENT-STATE.md               # Real-time project status
├── project-context.md             # Comprehensive project context
├── agent-playbook.md              # Tactical workflows and guides
└── knowledge-graph.json           # Semantic relationships
```

---

## 🚀 Quick Start by Role

### New Agent Starting Fresh
1. Read: `CURRENT-STATE.md` (2 min)
2. Read: `project-context.md` (5 min)
3. Find scenario: `agent-playbook.md` (2 min)
4. Execute with confidence

### Continuing Previous Work
1. Read: `CURRENT-STATE.md` → Check blockers
2. Read: `project-context.md` → Section 2.1 "Recently Implemented"
3. Read: `agent-playbook.md` → Scenario 2
4. Continue work

### Adding New Feature
1. Read: `project-context.md` → Section 3 "Design Decisions"
2. Read: `agent-playbook.md` → "TDD Feature Implementation"
3. Follow workflow
4. Update context

### Debugging Issue
1. Read: `CURRENT-STATE.md` → "Known Issues"
2. Read: `agent-playbook.md` → "Troubleshooting Guide"
3. Apply solution
4. Document if new issue

### Understanding Architecture
1. Read: `project-context.md` → Section 1 "Project Overview"
2. Read: `knowledge-graph.json` → Query relationships
3. Review patterns and conventions

---

## 📚 Document Purposes

### CURRENT-STATE.md
**When**: First thing every session
**Purpose**: Instant orientation
**Contains**:
- Current phase and blockers
- Test status
- Recent changes
- Next actions
- Quick commands

**Use for**:
- Quick status check
- Identifying current priorities
- Finding immediate next steps

---

### project-context.md
**When**: Need comprehensive understanding
**Purpose**: Full project context
**Contains**:
- Project overview
- Architecture decisions
- Current implementation
- Design rationale
- Code patterns
- Future roadmap

**Use for**:
- Deep context restoration
- Understanding design decisions
- Learning project patterns
- Planning major changes

---

### agent-playbook.md
**When**: Need specific workflow
**Purpose**: Tactical execution
**Contains**:
- Quick start scenarios
- Agent role patterns
- Step-by-step workflows
- Troubleshooting guides
- Emergency procedures

**Use for**:
- Finding exact workflow
- Solving common problems
- Agent coordination
- Emergency recovery

---

### knowledge-graph.json
**When**: Need relationship understanding
**Purpose**: Semantic structure
**Contains**:
- Entity definitions
- Dependency mappings
- Pattern catalog
- Issue tracking
- Roadmap items

**Use for**:
- Impact analysis
- Dependency tracing
- Pattern discovery
- Automated queries

---

### README.md
**When**: Learning the context system
**Purpose**: System documentation
**Contains**:
- Document explanations
- Usage guidelines
- Maintenance procedures
- Quality standards

**Use for**:
- Understanding context system
- Learning best practices
- Maintenance guidance

---

### CONTEXT-SYSTEM-SUMMARY.md
**When**: Overview needed
**Purpose**: System overview
**Contains**:
- What was created
- Why it matters
- How to use it
- ROI analysis

**Use for**:
- High-level understanding
- Sharing with team
- Justifying the system

---

## 🎯 Common Scenarios

### Scenario 1: "I just started, what's happening?"
```bash
cat .context/CURRENT-STATE.md
# ↓ Shows current phase, blockers, next steps
```

### Scenario 2: "What's the history of feature X?"
```bash
grep -A 20 "feature X" .context/project-context.md
# ↓ Shows implementation history and decisions
```

### Scenario 3: "How do I implement feature Y?"
```bash
grep -A 50 "Adding New Feature" .context/agent-playbook.md
# ↓ Shows TDD workflow step by step
```

### Scenario 4: "What depends on component Z?"
```bash
cat .context/knowledge-graph.json | jq '.relationships[] | select(.from == "component-z")'
# ↓ Shows all dependencies
```

### Scenario 5: "I'm stuck on error E, help!"
```bash
grep -A 30 "error E" .context/agent-playbook.md
# ↓ Shows troubleshooting steps
```

---

## 🔍 Search Patterns

### Find by Topic
```bash
grep -r "notification" .context/
grep -r "authentication" .context/
grep -r "error handling" .context/
```

### Find Recent Changes
```bash
git log --oneline .context/
git diff .context/
```

### Query Knowledge Graph
```bash
# All features
cat .context/knowledge-graph.json | jq '.entities.features'

# All relationships
cat .context/knowledge-graph.json | jq '.relationships'

# Specific pattern
cat .context/knowledge-graph.json | jq '.patterns.architectural[] | select(.id == "error-isolation")'
```

---

## 📊 Document Sizes

| Document | Size | Read Time |
|----------|------|-----------|
| CURRENT-STATE.md | 10KB | 2-3 min |
| project-context.md | 23KB | 5-10 min |
| agent-playbook.md | 18KB | 5-10 min (scan for scenario) |
| knowledge-graph.json | 20KB | N/A (query) |
| README.md | 11KB | 5 min |
| CONTEXT-SYSTEM-SUMMARY.md | 12KB | 5 min |

**Total**: ~94KB of structured context
**Time Investment**: 10-15 minutes for full orientation
**ROI**: Saves 15-30 minutes per session

---

## 🔄 Update Workflow

### Quick Updates (< 5 min)
1. Identify what changed
2. Update CURRENT-STATE.md
3. Update relevant section in project-context.md
4. Commit

### Major Updates (15-30 min)
1. Feature complete → Update all documents
2. Architecture change → Update project-context.md + knowledge-graph.json
3. New workflow → Update agent-playbook.md
4. Version bump if significant
5. Update change logs
6. Commit with detailed message

---

## 🏆 Best Practices

### Reading Context
- ✅ Start with CURRENT-STATE.md always
- ✅ Skim project-context.md for relevant sections
- ✅ Search agent-playbook.md for specific workflows
- ✅ Query knowledge-graph.json for relationships
- ✅ Use grep/jq for targeted searches

### Updating Context
- ✅ Update immediately after changes
- ✅ Be specific and concise
- ✅ Maintain consistent format
- ✅ Update all affected documents
- ✅ Commit context with feature changes

### Agent Coordination
- ✅ Document handoffs clearly
- ✅ Update status regularly
- ✅ Share blockers immediately
- ✅ Preserve learnings
- ✅ Improve system continuously

---

## 🚨 Emergency Quick Reference

### Server Chaos
```bash
pnpm reset                  # First line of defense
pnpm servers:status         # Check state
pnpm port:clear            # If ports stuck
```

### Test Failures
```bash
# Check known issues first
cat .context/CURRENT-STATE.md | grep -A 20 "Known Issues"

# Use troubleshooting guide
cat .context/agent-playbook.md | grep -A 100 "Troubleshooting"
```

### Schema Changes
```bash
cd packages/shared && pnpm build
cd packages/frontend && rm -rf node_modules/.vite
```

### Lost Context
```bash
# Read these in order:
cat .context/CURRENT-STATE.md
cat .context/project-context.md | head -100
cat .context/agent-playbook.md | grep -A 30 "Scenario 1"
```

---

## 📈 Quality Metrics

### Context System Health
- ✅ Last updated: 2025-10-12
- ✅ Version: 1.0
- ✅ Coverage: Comprehensive
- ✅ Accuracy: High
- ✅ Usefulness: Proven

### Success Indicators
- Fast agent onboarding (< 5 min)
- Pattern consistency maintained
- Known issues don't recur
- Smooth agent handoffs
- Zero knowledge loss

---

## 🔗 Cross-References

### Development Guidelines
- `/CLAUDE.md` - Primary development rules
- `/README.md` - Project overview

### Code Documentation
- JSDoc comments in source
- Test files as behavior specs
- Schema definitions as contracts

### External Resources
- Git commit history
- Pull request descriptions
- AWS SDK documentation
- Zod documentation

---

## 🎓 Learning Path

### New to Project (Day 1)
1. Read CONTEXT-SYSTEM-SUMMARY.md (overview)
2. Read CURRENT-STATE.md (status)
3. Skim project-context.md (background)
4. Find relevant scenario in agent-playbook.md
5. Start working

### Week 1
- Read project-context.md fully
- Review all playbook scenarios
- Query knowledge-graph.json
- Understand patterns and conventions

### Ongoing
- Update context as you work
- Improve workflows when found
- Add troubleshooting solutions
- Enhance documentation

---

## 📞 Support

### Getting Help
1. Check CURRENT-STATE.md for known issues
2. Search agent-playbook.md for solutions
3. Query knowledge-graph.json for context
4. Review project-context.md for history

### Contributing Improvements
1. Identify gap or improvement
2. Update relevant documents
3. Maintain consistency
4. Commit with clear message
5. Share learnings

---

## 🏁 Quick Commands

### Most Used
```bash
# Status check
cat .context/CURRENT-STATE.md

# Find workflow
grep -A 30 "your scenario" .context/agent-playbook.md

# Check decisions
grep -A 20 "your topic" .context/project-context.md

# Query relationships
cat .context/knowledge-graph.json | jq '.relationships'
```

### Navigation
```bash
# List all documents
ls -lah .context/

# View specific section
cat .context/project-context.md | grep -A 50 "Section Name"

# Search across all
grep -r "search term" .context/
```

---

## ✅ Checklist for Every Session

### Starting Work
- [ ] Read CURRENT-STATE.md
- [ ] Check for blockers
- [ ] Review recent changes
- [ ] Find relevant workflow
- [ ] Verify environment health

### During Work
- [ ] Follow established patterns
- [ ] Document decisions
- [ ] Update status as needed
- [ ] Track learnings

### Ending Session
- [ ] Update CURRENT-STATE.md
- [ ] Document any blockers
- [ ] Update project-context.md if significant
- [ ] Commit context updates
- [ ] Prepare handoff info

---

## 🎯 Current Priority (2025-10-12)

**Task**: Notification System Verification
**Status**: Code complete, awaiting test run
**Next Steps**:
1. Clean server restart: `pnpm reset && pnpm dev`
2. Run integration tests
3. Verify 28 notification tests pass
4. Commit verified changes

**Context**:
- See CURRENT-STATE.md for details
- See project-context.md Section 2.1 for implementation
- See agent-playbook.md Scenario 2 for workflow

---

## 📝 Document Versions

| Document | Version | Last Updated |
|----------|---------|--------------|
| CURRENT-STATE.md | 1.0 | 2025-10-12 |
| project-context.md | 1.0 | 2025-10-12 |
| agent-playbook.md | 1.0 | 2025-10-12 |
| knowledge-graph.json | 1.0 | 2025-10-12 |
| README.md | 1.0 | 2025-10-12 |
| CONTEXT-SYSTEM-SUMMARY.md | 1.0 | 2025-10-12 |
| INDEX.md | 1.0 | 2025-10-12 |

---

## 🌟 Remember

> **Good context is the foundation of effective agent coordination.**

This index helps you navigate the context system efficiently. Use it as your starting point for every session.

**Happy coding!**

---

*Last Updated: 2025-10-12*
*Maintained by: All agents (collective responsibility)*
