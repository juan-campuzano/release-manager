---
on: 
    pull_request:
        types: [opened, synchronize]

permissions:
    id-token: write
    contents: read
    issues: read
    pull-requests: read
    models: read

safe-outputs:
    create-pull-request-review-comment:
        max: 100
    submit-pull-request-review:
    resolve-pull-request-review-thread:

imports:
  - ../agents/reviewer.agent.md
---

Review Pull Requests based on the role you were assigned and add comments to the pull request based on your criteria.