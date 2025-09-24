import * as E2B from "@e2b/code-interpreter";
import { readFile, writeFile, unlink } from 'fs/promises';
import { join, resolve } from 'path';
import { Sandbox, FileEntry, Terminal, CreateSandboxOptions, RunCommandOptions } from "../sandbox.js";
import { randomUUID } from "crypto";
import { findDockerfileName, parseDockerfile, executeCommand, pathExists } from '../template-builder/utils.js';

export interface E2BBuildOptions {
  cpuCount?: number;        // Default: 2
  memoryMB?: number;        // Default: 512, must be even
  buildArgs?: Record<string, string>; // Format: <varname>=<value>
  noCache?: boolean;        // Skip build cache
  teamId?: string;          // Team ID from E2B dashboard
  readyCommand?: string;    // Command that must exit 0 for readiness
}

export class E2BSandbox extends Sandbox {
  protected sandbox: E2B.Sandbox | null = null;

  async init(id?: string, createOptions?: CreateSandboxOptions): Promise<void> {
    if (id) {
      this.sandbox = await E2B.Sandbox.connect(id);
    } else if (createOptions?.template) {
      this.sandbox = await E2B.Sandbox.create(createOptions.template, { envs: createOptions.envs });
    } else {
      this.sandbox = await E2B.Sandbox.create({ envs: createOptions?.envs });
    }
  }

  static async buildTemplate(
    directory: string,
    name: string,
    options?: E2BBuildOptions & {
      onLogs?: (chunk: string) => void;
    }
  ): Promise<void> {
    directory = resolve(directory);
    const dockerfileName = await findDockerfileName(directory);
    const dockerfilePath = join(directory, dockerfileName);

    if (!options?.teamId && !(await pathExists(join(directory, 'e2b.toml')))) {
      throw new Error('e2b.toml configuration file not found. Team ID is required in options to build E2B template.');
    }
    
    const tempDockerfileName = `Dockerfile.${randomUUID()}`
    const tempDockerfilePath = join(directory, tempDockerfileName)
    
    try {
      const dockerfile = parseDockerfile(await readFile(dockerfilePath, 'utf-8'));
      await writeFile(tempDockerfilePath, dockerfile.content);
      
      const args = [
        'template', 'build',
        '-p', directory,
        '-d', tempDockerfileName,
        '-n', name,
        ...(dockerfile.entrypoint ? ['-c', `"${dockerfile.entrypoint}"`] : []),
        ...(options?.cpuCount ? ['--cpu-count', options.cpuCount.toString()] : []),
        ...(options?.memoryMB ? ['--memory-mb', options.memoryMB.toString()] : []),
        ...(options?.readyCommand ? ['--ready-cmd', `"${options.readyCommand}"`] : []),
        ...(options?.teamId ? ['-t', `"${options.teamId}"`] : []),
        ...(options?.noCache ? ['--no-cache'] : []),
        ...(options?.buildArgs ? 
          Object.entries(options.buildArgs).flatMap(([k, v]) => ['--build-arg', `"${k}=${v}"`]) : [])
      ];
      
      await executeCommand('e2b', args, {
        cwd: directory,
        onLogs: options?.onLogs || console.log
      });
    } finally {
      await unlink(tempDockerfilePath);
    }
  }

  private ensureConnected(): E2B.Sandbox {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return this.sandbox;
  }

  async runCommand(
    command: string,
    options?: RunCommandOptions & { background?: false }
  ): Promise<{ exitCode: number; output: string }>;
  async runCommand(
    command: string,
    options?: RunCommandOptions & { background: true }
  ): Promise<{ pid: number }>;
  async runCommand(
    command: string,
    options?: RunCommandOptions & { background?: boolean }
  ): Promise<{ exitCode: number; output: string } | { pid: number }> {
    if (!this.sandbox) {
      await this.init();
    }
    const sandbox = this.ensureConnected();
    let commonOpts = {
      cwd: options?.cwd,
      envs: options?.envs,
      timeoutMs: options?.timeoutMs,
    };

    if (options?.background) {
      const handle = await sandbox.commands.run(
        command, { background: true, ...commonOpts }
      );
      return { pid: handle.pid };
    } else {
      try {
        const result = await sandbox.commands.run(
          command, { background: false, ...commonOpts }
        );
        return {
          exitCode: result.exitCode,
          output: result.error || result.stdout || result.stderr,
        };
      } catch (e) {
        if (e instanceof E2B.CommandExitError) {
          return {
            exitCode: e.exitCode,
            output: e.error || e.stdout || e.stderr,
          };
        }
        throw e;
      }
    }
  }

  id(): string {
    return this.ensureConnected().sandboxId;
  }

  async suspend(): Promise<void> {
    await this.ensureConnected().pause();
  }

  async resume(): Promise<void> {
    const sandbox = this.ensureConnected();
    if (!(await sandbox.isRunning())) {
      await E2B.Sandbox.resume(this.id());
    }
  }

  async destroy(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.kill();
      this.sandbox = null;
    }
  }

  async readFile(path: string, options?: { format: 'text' }): Promise<string>;
  async readFile(path: string, options?: { format: 'bytes' }): Promise<Uint8Array>;
  async readFile(path: string, options?: { format: 'text' | 'bytes' }): Promise<string | Uint8Array> {
    if (options?.format === 'bytes') {
      return await this.ensureConnected().files.read(path, {format: 'bytes'});
    }
    return await this.ensureConnected().files.read(path);
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    await this.ensureConnected().files.write(path, content);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    const entries = await this.ensureConnected().files.list(path);
    return entries.map((entry) => ({
      type: entry.type === "dir" ? "directory" : "file",
      name: entry.name,
    }));
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureConnected().files.remove(path);
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    await this.ensureConnected().files.rename(path, newPath);
  }

  async createDirectory(path: string): Promise<void> {
    await this.ensureConnected().files.makeDir(path);
  }

  async getPreviewUrl(port: number): Promise<string> {
    return `https://${this.ensureConnected().getHost(port)}`;
  }

  async createTerminal(onOutput: (output: string) => void): Promise<Terminal> {
    const terminal = new E2BTerminal(this.ensureConnected());
    await terminal.init(onOutput);
    return terminal;
  }
}

export class E2BTerminal extends Terminal {
  private pty: E2B.CommandHandle | undefined;
  private sandbox: E2B.Sandbox;

  constructor(sandbox: E2B.Sandbox) {
    super();
    this.sandbox = sandbox;
  }

  async init(onOutput: (data: string) => void): Promise<void> {
    this.pty = await this.sandbox.pty.create({
      rows: 20,
      cols: 80,
      timeoutMs: 0,
      onData: (data: Uint8Array) => {
        onOutput(new TextDecoder().decode(data));
      },
    });
  }

  async write(data: string): Promise<void> {
    if (!this.pty) {
      throw new Error("Terminal is not initialized");
    }
    await this.sandbox.pty.sendInput(
      this.pty.pid,
      new TextEncoder().encode(data)
    );
  }

  async resize(cols: number, rows: number): Promise<void> {
    if (!this.pty) {
      throw new Error("Terminal is not initialized");
    }
    await this.sandbox.pty.resize(this.pty.pid, { cols, rows });
  }

  async kill(): Promise<void> {
    if (this.pty) {
      await this.pty.kill();
      this.pty = undefined;
    }
  }
}
