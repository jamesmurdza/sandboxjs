import { CodeSandbox as CodeSandboxSDK, Sandbox, ReaddirEntry } from '@codesandbox/sdk';
import dotenv from 'dotenv';
import { BaseSandbox, FileEntry } from './BaseSandbox.js';

dotenv.config();

type SandboxSession = Awaited<ReturnType<Sandbox['connect']>>;

export class CodeSandbox implements BaseSandbox {
  private sdk: CodeSandboxSDK;
  protected sandbox: Sandbox | null = null;
  private session: SandboxSession | null = null;

  // We only run synchronous methods in the constructor
  // In the future, we might include async methods and use a ready pattern
  constructor() {
    const apiKey = process.env.CODESANDBOX_API_KEY;
    if (!apiKey) {
      throw new Error('CODESANDBOX_API_KEY is not set in environment variables');
    }
    this.sdk = new CodeSandboxSDK(apiKey);
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
  
  private async ensureSession(): Promise<SandboxSession> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
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
      throw new Error('Sandbox not initialized');
    }
    return this.sandbox.id;
  }

  async pause(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }
    await this.sdk.sandboxes.hibernate(this.sandbox.id);
  }

  async resume(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
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
    return result.map((entry: ReaddirEntry) => ({
      type: entry.type,
      name: entry.name
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
} 