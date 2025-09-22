import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { CodeReviewAgentService } from '../../ai/code-review-agent/code-review-agent.service';
import { GithubApiService } from '../github-api/github-api.service';
import { PromptService } from '../../ai/prompt/prompt.service';

describe('WebhookService', () => {
  let service: WebhookService;

  const mockCodeReviewAgentService = {};
  const mockGithubApiService = {};
  const mockPromptService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: CodeReviewAgentService, useValue: mockCodeReviewAgentService },
        { provide: GithubApiService, useValue: mockGithubApiService },
        { provide: PromptService, useValue: mockPromptService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('filterDiff', () => {
    // WebhookService 내부에 정의된 IGNORED_FILE_EXTENSIONS를 사용
    const IGNORED_FILE_EXTENSIONS = [
      '.svg', '.png', '.jpeg', '.jpg', '.gif', '.bmp', '.ico',
      '.mp4', '.mov', '.avi', '.webm',
      '.lock',
    ];

    it('should filter out diffs for ignored file extensions', () => {
      const diffWithIgnoredFile = `diff --git a/image.png b/image.png
index 123..456 100644
--- a/image.png
+++ b/image.png
@@ -1,1 +1,1 @@
-Binary file a/image.png has changed
+Binary file b/image.png has changed
diff --git a/src/index.ts b/src/index.ts
index 789..012 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,2 +1,3 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
`;

      const expectedDiff = `diff --git a/src/index.ts b/src/index.ts
index 789..012 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,2 +1,3 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
`;
      
      const result = (service as any).filterDiff(diffWithIgnoredFile, IGNORED_FILE_EXTENSIONS);
      expect(result.trim()).toBe(expectedDiff.trim());
    });

    it('should keep diffs for non-ignored file extensions', () => {
      const diffWithJsFile = `diff --git a/src/service.js b/src/service.js
index 123..456 100644
--- a/src/service.js
+++ b/src/service.js
@@ -1,2 +1,3 @@
 function add(a, b) {
-  return a + b;
+  return a - b;
+  // just kidding
}
`;
      const result = (service as any).filterDiff(diffWithJsFile, IGNORED_FILE_EXTENSIONS);
      expect(result.trim()).toBe(diffWithJsFile.trim());
    });

    it('should handle a mix of ignored and non-ignored files', () => {
      const mixedDiff = `diff --git a/logo.svg b/logo.svg
index 123..456 100644
--- a/logo.svg
+++ b/logo.svg
@@ -1,1 +1,1 @@
-Binary file a/logo.svg has changed
+Binary file b/logo.svg has changed
diff --git a/src/app.module.ts b/src/app.module.ts
index 789..012 100644
--- a/src/app.module.ts
+++ b/src/app.module.ts
@@ -1,1 +1,1 @@
 import { Module } from '@nestjs/common';
-import { AppController } from './app.controller';
+import { AppController } from './app.controller.js';
`;
      const expectedDiff = `diff --git a/src/app.module.ts b/src/app.module.ts
index 789..012 100644
--- a/src/app.module.ts
+++ b/src/app.module.ts
@@ -1,1 +1,1 @@
 import { Module } from '@nestjs/common';
-import { AppController } from './app.controller';
+import { AppController } from './app.controller.js';
`;
      const result = (service as any).filterDiff(mixedDiff, IGNORED_FILE_EXTENSIONS);
      expect(result.trim()).toBe(expectedDiff.trim());
    });

    it('should return an empty string for an empty diff', () => {
      const emptyDiff = '';
      const result = (service as any).filterDiff(emptyDiff, IGNORED_FILE_EXTENSIONS);
      expect(result).toBe('');
    });

    it('should not filter anything if ignoredExtensions is empty', () => {
      const diff = `diff --git a/image.png b/image.png
index 123..456 100644
--- a/image.png
+++ b/image.png
@@ -1,1 +1,1 @@
-Binary file a/image.png has changed
+Binary file b/image.png has changed
diff --git a/src/index.ts b/src/index.ts
index 789..012 100644
--- a/src/index.ts
+++ b/src/index.ts
@@ -1,2 +1,3 @@
 const a = 1;
-const b = 2;
+const b = 3;
+const c = 4;
`;
      const emptyIgnoredExtensions = [];
      const result = (service as any).filterDiff(diff, emptyIgnoredExtensions);
      expect(result.trim()).toBe(diff.trim());
    });
  });
});