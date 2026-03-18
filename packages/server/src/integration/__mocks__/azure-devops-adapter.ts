export class AzureDevOpsAdapter {
  constructor() {}
  authenticate = jest.fn();
  getBranches = jest.fn();
  getTags = jest.fn();
  getBuildStatus = jest.fn();
  getBuilds = jest.fn();
  getWorkItems = jest.fn();
  detectNewBuilds = jest.fn();
}
