import type { D1ApplicationRepository } from "@workit/db";
import type {
  StartApplicationResponse,
  ConfirmSubmissionRequest,
  ConfirmSubmissionResponse,
  ApplicationDetailResponse,
} from "@workit/contracts";

export class ApplicationService {
  constructor(private repo: D1ApplicationRepository) {}

  async start(userId: string, opportunityId: string): Promise<StartApplicationResponse> {
    const app = await this.repo.createOrGetForOpportunity(userId, opportunityId);
    if (app.state === "draft") {
      return this.repo.transition(userId, app.id, { type: "START_APPLICATION" });
    }

    return {
      application: app,
      event: {
        id: `evt_noop`,
        applicationId: app.id,
        fromState: app.state,
        toState: app.state,
        action: "NOOP",
        timestamp: new Date().toISOString(),
      },
    };
  }

  async confirmSubmission(
    userId: string,
    applicationId: string,
    data: ConfirmSubmissionRequest
  ): Promise<ConfirmSubmissionResponse> {
    return this.repo.confirmSubmission(userId, applicationId, data);
  }

  async getByOpportunity(
    userId: string,
    opportunityId: string
  ): Promise<ApplicationDetailResponse | null> {
    const application = await this.repo.findByOpportunity(userId, opportunityId);
    if (!application) return null;

    const answers = await this.repo.findSubmittedAnswers(application.id);

    return {
      application,
      answers,
    };
  }
}
