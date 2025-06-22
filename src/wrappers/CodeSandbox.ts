import { CodeSandbox as CodeSandboxSDK, Sandbox, WebSocketSession } from '@codesandbox/sdk';
import dotenv from 'dotenv';
import { BaseSandbox } from './BaseSandbox.js';

dotenv.config();

export class CodeSandbox implements BaseSandbox {
  private sdk: CodeSandboxSDK;
  protected sandbox: Sandbox | null = null;

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
  }
  
  async run(command: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }
    const session = await this.sandbox.connect();
    const result = await session.commands.run(command);
    await session.disconnect();
    await session.dispose();
    return result;
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
    // CodeSandbox does not provide a method to delete a sandbox  
    this.sandbox = null;
  }
} 