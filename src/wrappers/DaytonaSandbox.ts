import { Daytona, Sandbox, SandboxState } from '@daytonaio/sdk';
import { BaseSandbox, FileEntry, BaseTerminal } from './BaseSandbox.js';

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

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    const response = await this.sandbox.fs.downloadFile(path);
    return response.toString();
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.fs.uploadFile(Buffer.from(content), path);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    const response = await this.sandbox.fs.listFiles(path);
    return response.map((file) => ({
      type: file.isDir ? 'directory' : 'file',
      name: file.name
    }));
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.fs.moveFiles(path, newPath);
  }

  async deleteFile(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    const fileDetails = await this.sandbox.fs.getFileDetails(path);
    if (fileDetails.isDir) {
      // Daytona's deleteFile method does not support deleting directories
    } else {
      await this.sandbox.fs.deleteFile(path);
    }
  }

  async createDirectory(path: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    await this.sandbox.fs.createFolder(path, "755");
  }

  async getPreviewUrl(port: number): Promise<string> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    return (await this.sandbox.getPreviewLink(port)).url;
  }

  async createTerminal(onOutput: (output: string) => void): Promise<BaseTerminal> {
    if (!this.sandbox) {
      throw new Error('Sandbox not connected');
    }
    return new DaytonaTerminal();
  }
}

class DaytonaTerminal implements BaseTerminal {
  write(data: string): Promise<void> {
    // Stub
    return Promise.resolve()
  }
  resize(cols: number, rows: number): Promise<void> {
    // Stub
    return Promise.resolve()
  }
  kill(): Promise<void> {
    // Stub
    return Promise.resolve()
  }
}
  
