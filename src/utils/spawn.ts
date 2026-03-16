import { spawn } from "node:child_process";

export interface SpawnResult {
  stdout: string;
  stderr: string;
}

export function spawnWithInput(
  command: string,
  args: string[],
  input: string,
  options: { timeout?: number; env?: NodeJS.ProcessEnv } = {}
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      timeout: options.timeout ?? 60000,
      env: options.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}
