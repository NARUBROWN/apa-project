import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { isString } from '../../utils/type-guards.js'; 
import { ConfigService } from '@nestjs/config';
import Fuse from 'fuse.js';
import { PullRequestReviewComment } from '@octokit/webhooks-types';

@Injectable()
export class GithubApiService {
    private readonly logger = new Logger(GithubApiService.name);
    private readonly octokit: Octokit;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.octokit = new Octokit({
            auth: this.configService.get<string>('GITHUB_ACCESS_TOKEN')
        });
    }

    async createPullRequestReviewComment(owner: string, repo: string, pull_number: number, comment: any) {
        try {
            await this.octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: pull_number,
                body: comment,
            });
            this.logger.log(`PR #${pull_number}에 댓글이 성공적으로 게시되었습니다.`);
        } catch(e) {
            this.logger.error(`PR #${pull_number}에 댓글을 게시하는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async getPullRequestReviewComments(owner: string, repo: string, pull_number: number) {
        try {
            const { data: comments } = await this.octokit.rest.pulls.listReviewComments({
                owner,
                repo,
                pull_number,
            });
            return comments.filter(comment => comment.user?.login === 'APA-PR-Analyst') as PullRequestReviewComment[];
        } catch(e) {
            this.logger.error(`PR #${pull_number}의 리뷰 코멘트를 가져오는 중 오류 발생`);
            throw e;
        }
    }

    async getCommitDiff(owner: string, repo: string, commit_sha: string): Promise<string> {
        try {
            const response = await this.octokit.rest.repos.getCommit({
                owner,
                repo,
                ref: commit_sha,
                headers: {
                    accept: 'application/vnd.github.v3.diff'
                },
                mediaType: {
                    format: 'diff'
                }
            });

            if (!isString(response.data)) {
                this.logger.error(`커밋 ${commit_sha}의 diff를 가져왔지만 예상한 타입이 아닙니다.`);
                throw new Error('Github API에서 예상하지 못한 데이터를 가져왔습니다.');
            }
            return response.data;
        } catch(e) {
            this.logger.error(`커밋 ${commit_sha}의 diff를 가져오는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async getPullRequestCommits(owner: string, repo: string, pull_number: number): Promise<string[]> {
        try {
            const { data: commits } = await this.octokit.rest.pulls.listCommits({
                owner,
                repo,
                pull_number
            });

            return commits.map(commit => commit.sha);
        } catch(e) {
            this.logger.error(`PR #${pull_number}의 커밋 목록을 가져오는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async getPullRequestDiff(owner: string, repo: string, pull_number: number): Promise<string> {
        try {
            const response = await this.octokit.rest.pulls.get({
                owner,
                repo,
                pull_number,
                headers: {
                    accept: 'application/vnd.github.v3.diff'
                },
                mediaType: {
                    format: 'diff'
                }
            });
            
            if (!isString(response.data)) {
                this.logger.error(`PR #${pull_number}의 diff를 가져왔지만 예상한 타입이 아닙니다.`);
                throw new Error('Github API에서 예상하지 못한 데이터를 가져왔습니다.');
            }
            return response.data;
        } catch(e) {
            this.logger.error(`PR #${pull_number}의 diff를 가져오는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async createPullRequestReview(owner: string, repo: string, pull_number: number, comment: string): Promise<void> {
        try {
            await this.octokit.rest.pulls.createReview({
                owner,
                repo,
                pull_number,
                body: comment,
                event: 'COMMENT'
            });
            this.logger.log(`PR #${pull_number}에 AI 리뷰 코멘트가 성공적으로 게시되었습니다.`);
        } catch(e) {
            this.logger.error(`PR #${pull_number}에 코멘트를 게시하는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async getRepositoryTree(owner: string, repo: string, ref: string): Promise<string[]> {
        try {
            const response = await this.octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: ref,
                recursive: '1'
            });

            if (response.data.truncated) {
                this.logger.warn(`리포지토리 트리가 잘렸습니다. ${response.data.tree.length}`);
            }

            const filePaths = response.data.tree
                                    .filter(item => item.type === 'blob')
                                    .map(item => item.path);
            
            return filePaths;
        } catch(e) {
            this.logger.error(`리포지토리 트리 가져오는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async getFileContent(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
        try {
            const response = await this.octokit.rest.repos.getContent({
                owner,
                repo,
                path,
                ref
            });

            const content = (response.data as any).content;
            if (content) {
                return Buffer.from(content, 'base64').toString('utf-8');
            }
            return '';
        } catch(e) {
            if (e.status === 404) {
                this.logger.warn(`파일 내용을 가져오지 못했습니다. 파일이 삭제되었거나 경로가 올바르지 않습니다: ${path}`);
                return null;
            }
            this.logger.error(`파일 ${path} 내용을 가져오는 중 오류 발생: ${e.message}`);
            throw e;
        }
    }

    async getPullRequestFiles(owner: string, repo: string, pull_number: number): Promise<string[]> {
        try {
            const { data: files } = await this.octokit.rest.pulls.listFiles({
                owner,
                repo,
                pull_number
            });

            return files.map(file => file.filename);
        } catch(e) {
            this.logger.error(`PR #${pull_number}의 파일 목록을 가져오는 중 오류 발생: ${e.message}`);
            throw e; 
        }
    }

    fuzzySearchFiles(allFiles: string[], keywords: string[]): string[] {
        if (keywords.length === 0) {
            return [];
        }

        const options = {
            includeScore: true,
            keys: ['path'],
            threshold: 0.6,
        }

        const fuse = new Fuse(allFiles.map(path => ({ path })), options);
        
        let relevantFiles = new Set<string>();

        keywords.forEach(keyword => {
            const result = fuse.search(keyword);
            result.forEach(result => {
                if (result.score && result.score < 0.6) {
                    relevantFiles.add(result.item.path);
                }
            });
        });

        this.logger.log(`relevantFiles: ${relevantFiles} \n allFiles: ${allFiles}`);

        return Array.from(relevantFiles).slice(0, 3);
    }
}
