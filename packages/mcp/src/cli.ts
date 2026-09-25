#!/usr/bin/env node
import { createWorkitMcpServer } from "./server.js";
import { runStdioServer } from "./stdio.js";
import type { McpServices } from "./types.js";

const localServices: McpServices = {
  async searchOpportunities(_userId, _options) {
    return [];
  },
  async getOpportunity(_userId, _id) {
    return null;
  },
  async saveOpportunity(_userId, _candidate) {
    return {
      opportunityId: "opp_cli_1",
      state: "saved",
      snapshotId: "snap_cli_1",
      isDuplicate: false,
    };
  },
  async getCareerProfile(_userId) {
    return {
      profile: {
        id: "prof_cli",
        userId: "usr_local",
        fullName: "Local User",
        email: "user@local.dev",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      experiences: [],
      education: [],
      skills: [],
    };
  },
  async findAnswerMatch(_userId, _question) {
    return null;
  },
  async saveAnswer(_userId, input) {
    return {
      id: "ans_cli_1",
      userId: "usr_local",
      questionKey: "local",
      questionText: input.questionText,
      answerText: input.answerText,
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
  async matchJobEvidence(_userId, _jobDescription) {
    return {
      overallScore: 0,
      matchedCount: 0,
      partialCount: 0,
      missingCount: 0,
      totalRequirements: 0,
      matches: [],
    };
  },
  async searchGlobal(_userId, _query, _scope) {
    return [];
  },
  async startApplication(_userId, opportunityId) {
    return {
      application: {
        id: `app_cli_${Date.now()}`,
        userId: "usr_local",
        opportunityId,
        state: "applying",
        startedAt: new Date().toISOString(),
      },
    };
  },
  async confirmSubmission(_userId, applicationId, data) {
    return {
      application: {
        id: applicationId,
        userId: "usr_local",
        state: "applied",
        submittedAt: data.submittedAt || new Date().toISOString(),
        submittedJobSnapshotId: data.snapshotId,
      },
      answers: data.answers || [],
    };
  },
};

const server = createWorkitMcpServer({
  services: localServices,
  serverName: "workit-mcp",
  serverVersion: "0.1.0",
});

runStdioServer(server);
