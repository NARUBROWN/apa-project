
module.exports = {
  Octokit: class Octokit {
    constructor() {
      this.repos = {
        createCommitComment: jest.fn(),
      };
    }
  },
};
