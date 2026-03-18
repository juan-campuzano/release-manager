export class GitHubAdapter {
  constructor() {}
  authenticate = jest.fn();
  getBranches = jest.fn();
  getTags = jest.fn();
  getCommits = jest.fn();
  detectNewBranches = jest.fn();
  detectNewTags = jest.fn();
}
