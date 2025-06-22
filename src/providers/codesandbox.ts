import * as CodeSandbox from "@codesandbox/sdk";
import dotenv from "dotenv";
import { Sandbox, Terminal, FileEntry } from "../sandbox.js";

dotenv.config();

export class CodeSandboxSandbox extends Sandbox {
  private sdk: CodeSandbox.CodeSandbox;
  protected sandbox: CodeSandbox.Sandbox | null = null;
  private session: CodeSandbox.WebSocketSession | null = null;

  // We only run synchronous methods in the constructor
  // In the future, we might include async methods and use a ready pattern
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

  // Run asynchronous initialization methods
  async initialize(id?: string): Promise<void> {
    if (id) {
      this.sandbox = await this.sdk.sandboxes.resume(id);
    } else {
      this.sandbox = await this.sdk.sandboxes.create();
    }
  }

  async create(): Promise<void> {
    this.sandbox = await this.sdk.sandboxes.create();
  }

  async connect(id: string): Promise<void> {
    this.sandbox = await this.sdk.sandboxes.resume(id);
    if (this.session) {
      this.session.dispose();
      this.session = null;
    }
    this.session = await this.sandbox.connect();
  }

  private async ensureSession(): Promise<CodeSandbox.WebSocketSession> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    if (!this.session) {
      this.session = await this.sandbox.connect();
    }
    return this.session;
  }

  async run(command: string): Promise<string> {
    const session = await this.ensureSession();
    return await session.commands.run(command);
  }

  id(): string {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    return this.sandbox.id;
  }

  async pause(): Promise<void> {
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
    await this.pause();
    if (this.session) {
      await this.session.disconnect();
      this.session.dispose();
      this.session = null;
    }
    // CodeSandbox does not provide a method to delete a sandbox
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
    session: CodeSandbox.WebSocketSession,
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
    // CodeSandbox does not provide a method to resize a terminal
  }
}
