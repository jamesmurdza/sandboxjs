import { Daytona, Sandbox, SandboxState } from '@daytonaio/sdk';
import { BaseSandbox } from './BaseSandbox.js';

export class DaytonaSandbox implements BaseSandbox {
  private daytona: Daytona;
  protected sandbox: Sandbox | null = null;

  constructor() {
    this.daytona = new Daytona();
  }

  async initialize(id?: string): Promise<void> {
    if (id) {
      this.sandbox = await this.daytona.get(id);
      if (!this.sandbox) {
        throw new Error('Sandbox not found');
      }
    } else {
      this.sandbox = await this.daytona.create();
    }
    if (this.sandbox.state == SandboxState.STOPPED) {
      await this.sandbox.start();
    }
  }

  async run(command: string): Promise<string> {
    if (!this.sandbox) {
      await this.initialize();
    }
    if (!this.sandbox) {
      throw new Error('Failed to initialize sandbox');
    }
    const response = await this.sandbox.process.executeCommand(command);
    return response.result;
  }

  id(): string {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    return this.sandbox.id;
  }

  async pause(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    if (this.sandbox.state == SandboxState.STARTED) {
      await this.sandbox.stop();
      await this.sandbox.waitUntilStopped();
    }
  }

  async resume(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    if (this.sandbox.state == SandboxState.STOPPED) {
      await this.sandbox.start();
      await this.sandbox.waitUntilStarted();
    }
  }

  async destroy(): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.delete();
    this.sandbox = null;
  }
}
