import { Test, TestingModule } from '@nestjs/testing';
import { GithubApiService } from './github-api.service';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';

// Mock the entire @octokit/rest library
jest.mock('@octokit/rest');

// Create a typed mock object for the Octokit instance.
// This helps with type checking and intellisense in our tests.
const mockOctokit = {
  rest: {
    git: {
      getTree: jest.fn(),
    },
    repos: {
      getContent: jest.fn(),
    },
    pulls: {
      listFiles: jest.fn(),
    },
    issues: {
      createComment: jest.fn(),
    }
  },
};

// Cast the mocked constructor to jest.Mock so we can manipulate it
const MockedOctokit = Octokit as unknown as jest.Mock;

describe('GithubApiService', () => {
  let service: GithubApiService;

  beforeEach(async () => {
    // Reset all mock implementations and calls before each test
    MockedOctokit.mockClear();
    Object.values(mockOctokit.rest.git).forEach(mock => mock.mockClear());
    Object.values(mockOctokit.rest.repos).forEach(mock => mock.mockClear());
    Object.values(mockOctokit.rest.pulls).forEach(mock => mock.mockClear());
    Object.values(mockOctokit.rest.issues).forEach(mock => mock.mockClear());


    // When `new Octokit()` is called in the service, return our mock instance
    MockedOctokit.mockImplementation(() => mockOctokit);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubApiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'GITHUB_ACCESS_TOKEN') {
                return 'test-token';
              }
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<GithubApiService>(GithubApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRepositoryTree', () => {
    it('should return a list of file paths', async () => {
      const mockTree = [
        { path: 'src/main.ts', type: 'blob' },
        { path: 'src/app.module.ts', type: 'blob' },
        { path: 'README.md', type: 'blob' },
        { path: 'src', type: 'tree' }, // Should be filtered out
      ];
      mockOctokit.rest.git.getTree.mockResolvedValue({
        data: { tree: mockTree, truncated: false },
      });

      const result = await service.getRepositoryTree('owner', 'repo', 'ref');

      expect(result).toEqual(['src/main.ts', 'src/app.module.ts', 'README.md']);
      expect(mockOctokit.rest.git.getTree).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        tree_sha: 'ref',
        recursive: '1',
      });
    });

    it('should handle an empty tree', async () => {
        mockOctokit.rest.git.getTree.mockResolvedValue({
            data: { tree: [], truncated: false },
        });

        const result = await service.getRepositoryTree('owner', 'repo', 'ref');
        expect(result).toEqual([]);
    });
  });

  describe('getFileContent', () => {
    it('should return the content of a file', async () => {
        const mockContent = 'file content';
        const encodedContent = Buffer.from(mockContent).toString('base64');
        mockOctokit.rest.repos.getContent.mockResolvedValue({
            data: { content: encodedContent },
        });

        const result = await service.getFileContent('owner', 'repo', 'path', 'ref');
        expect(result).toBe(mockContent);
        expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
            owner: 'owner',
            repo: 'repo',
            path: 'path',
            ref: 'ref',
        });
    });

    it('should return null if the file is not found (404)', async () => {
        const error: any = new Error('Not Found');
        error.status = 404;
        mockOctokit.rest.repos.getContent.mockRejectedValue(error);

        const result = await service.getFileContent('owner', 'repo', 'path', 'ref');
        expect(result).toBeNull();
    });

    it('should throw an error for other statuses', async () => {
        const error: any = new Error('Internal Server Error');
        error.status = 500;
        mockOctokit.rest.repos.getContent.mockRejectedValue(error);

        await expect(service.getFileContent('owner', 'repo', 'path', 'ref')).rejects.toThrow('Internal Server Error');
    });
  });
});
