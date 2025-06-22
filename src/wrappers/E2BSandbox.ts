import { Sandbox } from '@e2b/code-interpreter';
import { BaseSandbox, FileEntry } from './BaseSandbox.js';

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
      throw new Error('Failed to initialize sandbox');
    }
    const result = await this.sandbox.commands.run(command);
    return result.stdout;
  }

  id(): string {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    return this.sandbox.sandboxId;
  }

  async pause(): Promise<void> {
    // E2B does not provide a method to pause a sandbox
  }

  async resume(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    if (!this.sandbox.isRunning()) {
      await Sandbox.connect(this.id());
    }
  }

  async destroy(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.kill();
    this.sandbox = null;
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    return await this.sandbox.files.read(path);
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.files.write(path, content);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    const entries = await this.sandbox.files.list(path);
    return entries.map((entry) => ({
        type: entry.type === "dir" ? "directory" : "file",
        name: entry.name
      })
    )
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.files.remove(path);
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.files.rename(path, newPath);
  }

  async createDirectory(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.files.makeDir(path);
  }
}