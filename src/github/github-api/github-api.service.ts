import { Injectable, Logger } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { isString } from 'src/utils/type-guards';

@Injectable()
export class GithubApiService {
    private readonly logger = new Logger(GithubApiService.name);
    private readonly octokit: Octokit;

    constructor() {
        this.octokit = new Octokit({
            auth: process.env.GITHUB_ACCESS_TOKEN
        });
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
}
