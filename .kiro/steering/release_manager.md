---
inclusion: always
---

## Spec Acceptance Criteria Format

When creating or updating spec requirements, all acceptance criteria must be written in BDD (Behavior-Driven Development) format using the Gherkin syntax:

```
Given [precondition or initial context]
When [action or event]
Then [expected outcome]
```

- Each acceptance criterion should follow the Given/When/Then structure.
- Use `And` to chain multiple conditions within a Given, When, or Then block.
- Keep each scenario focused on a single behavior.
- Write scenarios from the user's perspective using clear, non-technical language where possible.

Example:
```
Given the user is on the release detail page
And the release has active blockers
When the user clicks the "Resolve" button on a blocker
Then the blocker status should change to "Resolved"
And the blocker count should decrease by one
```
