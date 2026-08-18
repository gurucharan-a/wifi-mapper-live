import type { SurveyProject } from "./types";

/**
 * Temporary browser-side persistence only.
 * The interface below is intentionally storage-agnostic so it can be swapped
 * for a Lovable Cloud (Supabase) backed repository without touching the UI.
 */
export interface ProjectRepository {
  list(): Promise<SurveyProject[]>;
  save(project: SurveyProject): Promise<void>;
  remove(id: string): Promise<void>;
}

const KEY = "netdoc.projects.v1";

function read(): SurveyProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SurveyProject[]) : [];
  } catch {
    return [];
  }
}

function write(list: SurveyProject[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota exceeded — floor plans can be large */
  }
}

export const localProjectRepository: ProjectRepository = {
  async list() {
    return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
  async save(project) {
    const list = read().filter((p) => p.id !== project.id);
    list.push(project);
    write(list);
  },
  async remove(id) {
    write(read().filter((p) => p.id !== id));
  },
};
