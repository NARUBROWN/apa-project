import { PullRequestOpenedEvent, PullRequestReopenedEvent, PullRequestSynchronizeEvent } from "@octokit/webhooks-types";

export type PullRequestEventPayload =
    | PullRequestOpenedEvent
    | PullRequestReopenedEvent
    | PullRequestSynchronizeEvent;