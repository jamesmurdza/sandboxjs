import * as E2B from "@e2b/code-interpreter";
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { Sandbox, FileEntry, Terminal } from "../sandbox.js";
import { readTemplate, executeCommand } from '../template-builder/utils.js';

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

  async init(id?: string, template?: string): Promise<void> {
    if (id) {
      this.sandbox = await E2B.Sandbox.connect(id);
    } else if (template) {
      this.sandbox = await E2B.Sandbox.create(template);
    } else {
      this.sandbox = await E2B.Sandbox.create();
    }
  }

  static async buildTemplate(
    directory: string,
    name: string,
    options?: E2BBuildOptions
  ): Promise<void> {
    const { dockerfile } = await readTemplate(directory);
    
    const tempDockerfilePath = join(directory, 'Dockerfile.e2b');
    await writeFile(tempDockerfilePath, dockerfile.content);
    
    const args = [
      'template', 'build',
      '-p', directory,
      '-d', "Dockerfile.e2b",
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
    
    await executeCommand('e2b', args, directory);
    await unlink(tempDockerfilePath);
  }

  private ensureConnected(): E2B.Sandbox {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return this.sandbox;
  }

  async runCommand(command: string): Promise<string> {
    if (!this.sandbox) {
      await this.init();
    }
    const sandbox = this.ensureConnected();
    const result = await sandbox.commands.run(command);
    return result.stdout;
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

  async readFile(path: string): Promise<string> {
    return await this.ensureConnected().files.read(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
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
    return this.ensureConnected().getHost(port);
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
