module.exports = {
  Octokit: jest.fn(() => ({
    repos: {
      createCommitComment: jest.fn(),
    },
  })),
};
