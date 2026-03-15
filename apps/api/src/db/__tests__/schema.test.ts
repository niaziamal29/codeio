import { describe, it, expect } from "vitest";
import * as schema from "../schema.js";

describe("Database Schema", () => {
  it("exports all required tables", () => {
    expect(schema.users).toBeDefined();
    expect(schema.projects).toBeDefined();
    expect(schema.sessions).toBeDefined();
    expect(schema.checkpoints).toBeDefined();
    expect(schema.messages).toBeDefined();
    expect(schema.auditLogs).toBeDefined();
  });

  it("projects table has correct columns", () => {
    const cols = Object.keys(schema.projects);
    expect(cols).toContain("id");
    expect(cols).toContain("userId");
    expect(cols).toContain("name");
    expect(cols).toContain("description");
    expect(cols).toContain("framework");
    expect(cols).toContain("status");
    expect(cols).toContain("createdAt");
    expect(cols).toContain("updatedAt");
  });

  it("sessions table has correct columns", () => {
    const cols = Object.keys(schema.sessions);
    expect(cols).toContain("id");
    expect(cols).toContain("projectId");
    expect(cols).toContain("userId");
    expect(cols).toContain("status");
    expect(cols).toContain("agentModel");
  });

  it("checkpoints table has correct columns", () => {
    const cols = Object.keys(schema.checkpoints);
    expect(cols).toContain("id");
    expect(cols).toContain("sessionId");
    expect(cols).toContain("summary");
    expect(cols).toContain("gitSha");
    expect(cols).toContain("qaStatus");
    expect(cols).toContain("screenshotUrl");
    expect(cols).toContain("filesChanged");
    expect(cols).toContain("confidence");
  });

  it("exports all enums", () => {
    expect(schema.projectStatusEnum).toBeDefined();
    expect(schema.sessionStatusEnum).toBeDefined();
    expect(schema.qaStatusEnum).toBeDefined();
    expect(schema.messageRoleEnum).toBeDefined();
    expect(schema.auditActionEnum).toBeDefined();
  });
});
