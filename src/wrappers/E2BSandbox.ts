import { Sandbox } from '@e2b/code-interpreter';
import { BaseSandbox } from './BaseSandbox.js';

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
    return this.getSandboxId();
  }

  protected getSandboxId(): string {
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
      await Sandbox.connect(this.getSandboxId());
    }
  }

  async destroy(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.kill();
    this.sandbox = null;
  }
}