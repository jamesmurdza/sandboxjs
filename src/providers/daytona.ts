import * as Daytona from "@daytonaio/sdk";
import { Sandbox, FileEntry, Terminal } from "../sandbox.js";

export class DaytonaSandbox extends Sandbox {
  private daytona: Daytona.Daytona;
  protected sandbox: Daytona.Sandbox | null = null;

  constructor() {
    super();
    this.daytona = new Daytona.Daytona();
  }

  async initialize(id?: string): Promise<void> {
    if (id) {
      this.sandbox = await this.daytona.get(id);
      if (!this.sandbox) {
        throw new Error("Sandbox not found");
      }
    } else {
      this.sandbox = await this.daytona.create();
    }
    if (this.sandbox.state == Daytona.SandboxState.STOPPED) {
      await this.sandbox.start();
    }
  }

  private ensureConnected(): Daytona.Sandbox {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return this.sandbox;
  }

  async run(command: string): Promise<string> {
    if (!this.sandbox) {
      await this.initialize();
    }
    const sandbox = this.ensureConnected();
    const response = await sandbox.process.executeCommand(command);
    return response.result;
  }

  id(): string {
    return this.ensureConnected().id;
  }

  async pause(): Promise<void> {
    const sandbox = this.ensureConnected();
    if (sandbox.state == Daytona.SandboxState.STARTED) {
      await sandbox.stop();
      await sandbox.waitUntilStopped();
    }
  }

  async resume(): Promise<void> {
    const sandbox = this.ensureConnected();
    if (sandbox.state == Daytona.SandboxState.STOPPED) {
      await sandbox.start();
      await sandbox.waitUntilStarted();
    }
  }

  async destroy(): Promise<void> {
    if (this.sandbox) {
      await this.sandbox.delete();
      this.sandbox = null;
    }
  }

  async readFile(path: string): Promise<string> {
    const response = await this.ensureConnected().fs.downloadFile(path);
    return response.toString();
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.ensureConnected().fs.uploadFile(Buffer.from(content), path);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    const response = await this.ensureConnected().fs.listFiles(path);
    return response.map((file) => ({
      type: file.isDir ? "directory" : "file",
      name: file.name,
    }));
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    await this.ensureConnected().fs.moveFiles(path, newPath);
  }

  async deleteFile(path: string): Promise<void> {
    const sandbox = this.ensureConnected();
    const fileDetails = await sandbox.fs.getFileDetails(path);
    if (fileDetails.isDir) {
      // Daytona's deleteFile method does not support deleting directories
    } else {
      await sandbox.fs.deleteFile(path);
    }
  }

  async createDirectory(path: string): Promise<void> {
    await this.ensureConnected().fs.createFolder(path, "755");
  }

  async getPreviewUrl(port: number): Promise<string> {
    return (await this.ensureConnected().getPreviewLink(port)).url;
  }

  async createTerminal(onOutput: (output: string) => void): Promise<Terminal> {
    this.ensureConnected(); // Just to check connection
    return new DaytonaTerminal();
  }
}

// Daytona doesn't provide a pseudo-terminal SDK
class DaytonaTerminal extends Terminal {
  write(data: string): Promise<void> {
    return Promise.resolve();
  }

  resize(cols: number, rows: number): Promise<void> {
    return Promise.resolve();
  }

  kill(): Promise<void> {
    return Promise.resolve();
  }
}
