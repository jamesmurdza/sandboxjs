import * as CodeSandbox from "@codesandbox/sdk";
import dotenv from "dotenv";
import { Sandbox, Terminal, FileEntry, CreateSandboxOptions, RunCommandOptions } from "../sandbox.js";

dotenv.config();

export class CodeSandboxSandbox extends Sandbox {
  private sdk: CodeSandbox.CodeSandbox;
  protected sandbox: CodeSandbox.Sandbox | null = null;
  private session: CodeSandbox.SandboxClient | null = null;

  constructor() {
    super();
    const apiKey = process.env.CODESANDBOX_API_KEY;
    if (!apiKey) {
      throw new Error(
        "CODESANDBOX_API_KEY is not set in environment variables"
      );
    }
    this.sdk = new CodeSandbox.CodeSandbox(apiKey);
  }

  async init(id?: string, createOptions?: CreateSandboxOptions): Promise<void> {
    if (createOptions?.envs) {
      throw new Error("CodeSandbox does not support passing environment variables");
    }

    if (id) {
      this.sandbox = await this.sdk.sandboxes.resume(id);
    } else if (createOptions?.template) {
      this.sandbox = await this.sdk.sandboxes.create({
        id: createOptions.template,
      });
    } else {
      this.sandbox = await this.sdk.sandboxes.create();
    }
  }

  private async ensureSession(): Promise<CodeSandbox.SandboxClient> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    if (!this.session) {
      this.session = await this.sandbox.connect();
    }
    return this.session;
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
    const session = await this.ensureSession();
    if (options?.background) {
      // CodeSandbox runBackground doesn't return a PID, so we simulate it with a shell command
      const pidCommand = `nohup sh -c '${command}' & echo $!`;
      const result = await session.commands.run(
        pidCommand, { cwd: options.cwd, env: options.envs }
      );
      const pid = parseInt(result.trim());
      return { pid };
    }
    const output = await session.commands.run(
      command, { cwd: options?.cwd, env: options?.envs }
    );
    // Get the actual exit code from the last command
    const exitCodeResult = await session.commands.run(
      'echo $?', { cwd: options?.cwd, env: options?.envs }
    );
    const exitCode = parseInt(exitCodeResult.trim()) || 0;
    return { exitCode, output };
  }

  id(): string {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    return this.sandbox.id;
  }

  async suspend(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    await this.sdk.sandboxes.hibernate(this.sandbox.id);
  }

  async resume(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    await this.sdk.sandboxes.resume(this.sandbox.id);
  }

  async destroy(): Promise<void> {
    await this.suspend();
    if (this.session) {
      await this.session.disconnect();
      this.session.dispose();
      this.session = null;
    }
    console.warn("CodeSandbox does not actually support destroying sandboxes");
    this.sandbox = null;
  }

  async readFile(path: string): Promise<string> {
    const session = await this.ensureSession();
    return await session.fs.readTextFile(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    const session = await this.ensureSession();
    await session.fs.writeTextFile(path, content);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    const session = await this.ensureSession();
    const result = await session.fs.readdir(path);
    return result.map((entry: CodeSandbox.ReaddirEntry) => ({
      type: entry.type,
      name: entry.name,
    }));
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    const session = await this.ensureSession();
    await session.fs.rename(path, newPath);
  }

  async deleteFile(path: string): Promise<void> {
    const session = await this.ensureSession();
    await session.fs.remove(path);
  }

  async createDirectory(path: string): Promise<void> {
    const session = await this.ensureSession();
    await session.fs.mkdir(path);
  }

  async getPreviewUrl(port: number): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    const session = await this.ensureSession();
    return await session.hosts.getUrl(port);
  }

  async createTerminal(onOutput: (output: string) => void): Promise<Terminal> {
    const session = await this.ensureSession();
    return await CodeSandboxTerminal.create(session, onOutput);
  }
}

export class CodeSandboxTerminal extends Terminal {
  private terminal: CodeSandbox.Terminal;

  constructor(terminal: CodeSandbox.Terminal) {
    super();
    this.terminal = terminal;
  }

  static async create(
    session: CodeSandbox.SandboxClient,
    onOutput: (output: string) => void
  ): Promise<CodeSandboxTerminal> {
    const terminal = await session.terminals.create();
    terminal.onOutput(onOutput);
    return new CodeSandboxTerminal(terminal);
  }

  async write(command: string): Promise<void> {
    await this.terminal.write(command);
  }

  async kill(): Promise<void> {
    await this.terminal.kill();
  }

  async resize(cols: number, rows: number): Promise<void> {
    console.warn("CodeSandbox terminals do not support resizing");
  }
}
