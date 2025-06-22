import { Sandbox, CommandHandle } from "@e2b/code-interpreter";
import { BaseSandbox, FileEntry, BaseTerminal } from "./BaseSandbox.js";

export class E2BSandbox implements BaseSandbox {
  protected sandbox: Sandbox | null = null;

  async initialize(id?: string): Promise<void> {
    if (id) {
      this.sandbox = await Sandbox.connect(id);
    } else {
      this.sandbox = await Sandbox.create();
    }
  }

  async run(command: string): Promise<string> {
    if (!this.sandbox) {
      await this.initialize();
    }
    if (!this.sandbox) {
      throw new Error("Failed to initialize sandbox");
    }
    const result = await this.sandbox.commands.run(command);
    return result.stdout;
  }

  id(): string {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return this.sandbox.sandboxId;
  }

  async pause(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    await this.sandbox.pause();
  }

  async resume(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    if (!(await this.sandbox.isRunning())) {
      await Sandbox.resume(this.id());
    }
  }

  async destroy(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    await this.sandbox.kill();
    this.sandbox = null;
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return await this.sandbox.files.read(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    await this.sandbox.files.write(path, content);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    const entries = await this.sandbox.files.list(path);
    return entries.map((entry) => ({
      type: entry.type === "dir" ? "directory" : "file",
      name: entry.name,
    }));
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    await this.sandbox.files.remove(path);
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    await this.sandbox.files.rename(path, newPath);
  }

  async createDirectory(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    await this.sandbox.files.makeDir(path);
  }

  async getPreviewUrl(port: number): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return this.sandbox.getHost(port);
  }

  async createTerminal(
    onOutput: (output: string) => void
  ): Promise<BaseTerminal> {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    const terminal = new E2BTerminal(this.sandbox);
    await terminal.init(onOutput);
    return terminal;
  }
}

export class E2BTerminal implements BaseTerminal {
  private pty: CommandHandle | undefined;
  private sandbox: Sandbox;

  constructor(sandbox: Sandbox) {
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
