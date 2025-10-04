import * as Beam from "@beamcloud/beam-js";
import {
  Sandbox,
  FileEntry,
  Terminal,
  CreateSandboxOptions,
  RunCommandOptions,
} from "../sandbox.js";
import { findDockerfileName } from "../template-builder/utils.js";
import { randomUUID } from "crypto";
import { readFile, writeFile, unlink } from "fs/promises";
import { join, resolve } from "path";

export class BeamSandbox extends Sandbox {
  protected sandboxInstance: Beam.SandboxInstance | null = null;
  protected beamSandbox: Beam.Sandbox | null = null; // The Beam Sandbox client
  private snapshotId: string | null = null;

  async init(id?: string, createOptions?: CreateSandboxOptions): Promise<void> {
    if (!process.env.BEAM_TOKEN || !process.env.BEAM_WORKSPACE_ID) {
      throw new Error(
        "BEAM_TOKEN and BEAM_WORKSPACE_ID environment variables must be set."
      );
    }

    Beam.beamOpts.token = process.env.BEAM_TOKEN;
    Beam.beamOpts.workspaceId = process.env.BEAM_WORKSPACE_ID;

    if (id) {
      this.beamSandbox = new Beam.Sandbox({ name: randomUUID() });
      this.sandboxInstance = await this.beamSandbox.connect(id);
    } else if (createOptions?.template) {
      const image = new Beam.Image({ baseImage: createOptions.template });
      this.beamSandbox = new Beam.Sandbox({
        name: randomUUID(),
        image: image,
        env: createOptions.envs,
      });
      this.sandboxInstance = await this.beamSandbox.create();
    } else {
      this.beamSandbox = new Beam.Sandbox({
        name: randomUUID(),
        env: createOptions?.envs,
      });
      this.sandboxInstance = await this.beamSandbox.create();
    }
  }

  static async buildTemplate(directory: string, name: string): Promise<void> {
    // The name parameter currently does nothing. This needs to be fixed.
    directory = resolve(directory);
    const dockerfileName = await findDockerfileName(directory);
    const dockerfilePath = join(directory, dockerfileName);

    const image = await Beam.Image.fromDockerfile(dockerfilePath, directory);

    await image.build();
  }

  private ensureConnected(): Beam.SandboxInstance {
    if (!this.sandboxInstance) {
      throw new Error("Sandbox not connected");
    }
    return this.sandboxInstance;
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
    // This needs to be updated to handle quotes and other shell features.
    // For now, we just split the command into parts and execute it.
    const instance = this.ensureConnected();
    const parts = command.split(" ");
    const cmd = parts[0];
    const args = parts.slice(1);

    if (options?.background) {
      const process = await instance.exec(cmd, ...args);
      return { pid: process.pid || -1 };
    } else {
      const process = await instance.exec(cmd, ...args);
      const exitCode = await process.wait();
      const stdout = process.stdout.read();
      const stderr = process.stderr.read();
      return {
        exitCode: exitCode || 0, // Assuming 0 if not explicitly returned
        output: stdout + stderr,
      };
    }
  }

  id(): string {
    return this.ensureConnected().sandboxId;
  }

  async suspend(): Promise<void> {
    // Beam Sandbox does not have a suspend method.
    // We need to snapshot the sandbox and terminate it.
    if (!this.sandboxInstance) {
      throw new Error("Sandbox not initialized");
    }
    this.snapshotId = await this.sandboxInstance.snapshot();
    await this.sandboxInstance.terminate();
    this.sandboxInstance = null;
    this.beamSandbox = null;
  }

  async resume(): Promise<void> {
    // Beam Sandbox does not have a resume method.
    // We need to create a new sandbox from the snapshot and resume it.
    if (!this.snapshotId) {
      throw new Error("No snapshot found to resume from.");
    }
    this.beamSandbox = new Beam.Sandbox({ name: randomUUID() });
    this.sandboxInstance = await this.beamSandbox.createFromSnapshot(
      this.snapshotId
    );
    this.snapshotId = null;
  }

  async destroy(): Promise<void> {
    if (this.sandboxInstance) {
      await this.sandboxInstance.terminate();
      this.sandboxInstance = null;
      this.beamSandbox = null;
    }
  }

  async readFile(path: string, options?: { format: "text" }): Promise<string>;
  async readFile(
    path: string,
    options?: { format: "bytes" }
  ): Promise<Uint8Array>;
  async readFile(
    path: string,
    options?: { format: "text" | "bytes" }
  ): Promise<string | Uint8Array> {
    const instance = this.ensureConnected();

    // Beam SDK doesn't have a direct read file method, so we need to download it to a temporary file.
    const tempLocalPath = join("/tmp", randomUUID()); // Use a temporary local path
    await instance.fs.downloadFile(path, tempLocalPath);
    const content = await readFile(tempLocalPath);
    await unlink(tempLocalPath);

    if (options?.format === "bytes") {
      return content;
    }
    return content.toString();
  }

  async writeFile(path: string, content: string | Uint8Array): Promise<void> {
    // Beam SDK doesn't have a direct write file method, so we need to upload it to a temporary file.
    const instance = this.ensureConnected();
    const tempLocalPath = join("/tmp", randomUUID());
    await writeFile(tempLocalPath, content);
    await instance.fs.uploadFile(tempLocalPath, path);
    console.log(`Uploaded file to ${path} from ${tempLocalPath}`);
    await unlink(tempLocalPath);
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    const instance = this.ensureConnected();
    const files = await instance.fs.listFiles(path);
    return files.map((file) => ({
      type: file.isDir ? "directory" : "file",
      name: file.name,
    }));
  }

  async deleteFile(path: string): Promise<void> {
    await this.ensureConnected().fs.deleteFile(path);
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    // Beam SDK doesn't have a direct move/rename file method.
    // For simplicity, let's execute a shell command for now.
    // (This is bad because the paths are not sanitized in any way.)
    await this.runCommand(`mv ${path} ${newPath}`);
  }

  async createDirectory(path: string): Promise<void> {
    // Beam SDK doesn't have a direct create directory method.
    // (This is bad because the paths are not sanitized in any way.)
    await this.runCommand(`mkdir -p ${path}`);
  }

  async getPreviewUrl(port: number): Promise<string> {
    return await this.ensureConnected().exposePort(port);
  }

  async createTerminal(onOutput: (output: string) => void): Promise<Terminal> {
    throw new Error(
      "Beam sandboxes do not support interactive terminals directly via SDK. Consider using `exec` for commands."
    );
  }
}
