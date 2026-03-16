import { readFile, writeFile, readdir, unlink, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "../error/reporter.js";

const PROFILES_DIR = join(process.cwd(), "profiles");

export interface Profile {
  name: string;
  url: string;
  cookies: CookieData[];
  localStorage?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CookieData {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
}

export class ProfileManager {
  private dir: string;

  constructor(dir: string = PROFILES_DIR) {
    this.dir = dir;
  }

  private filePath(name: string): string {
    return join(this.dir, `${name}.json`);
  }

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
  }

  async save(profile: Profile): Promise<void> {
    await this.init();
    profile.updatedAt = new Date().toISOString();
    await writeFile(this.filePath(profile.name), JSON.stringify(profile, null, 2), "utf-8");
    logger.info(`Profile saved: ${profile.name}`);
  }

  async load(name: string): Promise<Profile | null> {
    const fp = this.filePath(name);
    if (!existsSync(fp)) return null;
    const raw = await readFile(fp, "utf-8");
    return JSON.parse(raw) as Profile;
  }

  async list(): Promise<string[]> {
    await this.init();
    const files = await readdir(this.dir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }

  async remove(name: string): Promise<boolean> {
    const fp = this.filePath(name);
    if (!existsSync(fp)) return false;
    await unlink(fp);
    logger.info(`Profile removed: ${name}`);
    return true;
  }
}
