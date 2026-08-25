import { promises as fs } from "fs";
import path from "path";
import { createId, nowIso } from "@/lib/ids";
import { getEnv } from "@/lib/env";
import type { BrowserAgentJob } from "@/services/browser-agent/types";

async function jobsDir() {
  const dir = path.join(getEnv().dataDir, "agent-jobs");
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function jobPath(id: string) {
  return path.join(getEnv().dataDir, "agent-jobs", `${id}.json`);
}

export async function createJob(
  partial: Omit<BrowserAgentJob, "id" | "status" | "logs" | "createdAt" | "updatedAt">,
): Promise<BrowserAgentJob> {
  await jobsDir();
  const now = nowIso();
  const job: BrowserAgentJob = {
    ...partial,
    id: createId("agent"),
    status: "queued",
    logs: [],
    createdAt: now,
    updatedAt: now,
  };
  await fs.writeFile(jobPath(job.id), JSON.stringify(job, null, 2), "utf8");
  return job;
}

export async function getJob(id: string): Promise<BrowserAgentJob | null> {
  try {
    const raw = await fs.readFile(jobPath(id), "utf8");
    return JSON.parse(raw) as BrowserAgentJob;
  } catch {
    return null;
  }
}

export async function updateJob(
  id: string,
  patch: Partial<BrowserAgentJob>,
): Promise<BrowserAgentJob> {
  const current = await getJob(id);
  if (!current) throw new Error("Job do agente não encontrado.");
  const next: BrowserAgentJob = {
    ...current,
    ...patch,
    logs: patch.logs ?? current.logs,
    updatedAt: nowIso(),
  };
  await fs.writeFile(jobPath(id), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function appendJobLog(id: string, line: string): Promise<void> {
  const current = await getJob(id);
  if (!current) return;
  await updateJob(id, { logs: [...current.logs, line] });
}

export async function listJobs(limit = 30): Promise<BrowserAgentJob[]> {
  const dir = await jobsDir();
  const files = await fs.readdir(dir);
  const jobs: BrowserAgentJob[] = [];
  for (const file of files.filter((f) => f.endsWith(".json"))) {
    try {
      const raw = await fs.readFile(path.join(dir, file), "utf8");
      jobs.push(JSON.parse(raw) as BrowserAgentJob);
    } catch {
      // ignore corrupt
    }
  }
  return jobs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
