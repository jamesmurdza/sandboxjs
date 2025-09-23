import * as Daytona from "@daytonaio/sdk";
import { readFile, writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { Sandbox, FileEntry, Terminal, CreateSandboxOptions, RunCommandOptions } from "../sandbox.js";
import { findDockerfileName, parseDockerfile } from '../template-builder/utils.js';

export interface DaytonaBuildOptions {
  cpu?: number;
  gpu?: number;
  memory?: number;
  disk?: number;
}

export class DaytonaSandbox extends Sandbox {
  private daytona: Daytona.Daytona;
  protected sandbox: Daytona.Sandbox | null = null;

  constructor() {
    super();
    this.daytona = new Daytona.Daytona();
  }

  async init(id?: string, createOptions?: CreateSandboxOptions): Promise<void> {
    if (id) {
      this.sandbox = await this.daytona.get(id);
      if (!this.sandbox) {
        throw new Error("Sandbox not found");
      }
    } else if (createOptions?.template) {
      this.sandbox = await this.daytona.create({ snapshot: createOptions.template, public: true, envVars: createOptions.envs });
    } else {
      this.sandbox = await this.daytona.create({ public: true, envVars: createOptions?.envs });
    }
    if (this.sandbox.state == Daytona.SandboxState.STOPPED) {
      await this.sandbox.start();
    }
  }

  static async buildTemplate(
    directory: string,
    name: string,
    options?: DaytonaBuildOptions & {
      onLogs?: (chunk: string) => void;
    }
  ): Promise<void> {
    const dockerfileName = await findDockerfileName(directory);
    const dockerfilePath = join(directory, dockerfileName);
    const originalContent = await readFile(dockerfilePath, 'utf-8')
    
    // Even when we pass path to custom dockerfile to Image.fromDockerfile,
    // it still uses default "Dockerfile" if available.
    // To resolve this, we will restore original content once build is completed.
    const tempDockerfilePath = join(directory, 'Dockerfile');
    const dockerfile = parseDockerfile(originalContent);
    
    try {
      await writeFile(
        tempDockerfilePath, 
        dockerfile.content + `\nENTRYPOINT ${dockerfile.entrypoint}\n`
      );

      const daytona = new Daytona.Daytona();
      await daytona.snapshot.create(
        {
          name,
          image: Daytona.Image.fromDockerfile(tempDockerfilePath),
          resources: {
            cpu: options?.cpu,
            gpu: options?.gpu,
            memory: options?.memory,
            disk: options?.disk
          }
        }, 
        { onLogs: options?.onLogs || console.log }
      )
    } finally {
      await unlink(tempDockerfilePath);
      if (dockerfileName === 'Dockerfile') {
        await writeFile(dockerfilePath, originalContent);
      }
    }
  }

  private ensureConnected(): Daytona.Sandbox {
    if (!this.sandbox) {
      throw new Error("Sandbox not connected");
    }
    return this.sandbox;
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
    if (!this.sandbox) {
      await this.init();
    }
    const sandbox = this.ensureConnected();

    if (options?.background) {
      // For background commands, extract the PID and return it
      const pidCommand = `nohup sh -c '${command}' & echo $!`;
      const response = await sandbox.process.executeCommand(
        pidCommand, options?.cwd, options?.envs, options?.timeoutMs
      );
      const pid = parseInt(response.result.trim());
      return { pid };
    }
    
    const response = await sandbox.process.executeCommand(
      command, options?.cwd, options?.envs, options?.timeoutMs
    );
    return { exitCode: response.exitCode, output: response.result };
  }

  id(): string {
    return this.ensureConnected().id;
  }

  async suspend(): Promise<void> {
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

  async readFile(path: string, options?: { format: 'text' }): Promise<string>;
  async readFile(path: string, options?: { format: 'bytes' }): Promise<Uint8Array>;
  async readFile(path: string, options?: { format: 'text' | 'bytes' }): Promise<string | Uint8Array> {
    const response = await this.ensureConnected().fs.downloadFile(path);
    if (options?.format === 'bytes') {
      return new Uint8Array(response);
    }
    return response.toString();
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
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
      console.warn("Daytona does not support deleting directories");
    } else {
      await sandbox.fs.deleteFile(path);
    }
  }

  async createDirectory(path: string): Promise<void> {
    await this.ensureConnected().fs.createFolder(path, "755");
  }

  async getPreviewUrl(port: number): Promise<string> {
    const sandbox = this.ensureConnected();
    if (!sandbox.public) {
      throw new Error("Sandbox is not public");
    }
    return (await sandbox.getPreviewLink(port)).url;
  }

  async createTerminal(onOutput: (output: string) => void): Promise<Terminal> {
    throw new Error("Daytona sandboxes do not support interactive terminals");
  }
}


