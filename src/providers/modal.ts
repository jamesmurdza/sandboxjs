import { App, Sandbox as ModalSDKSandbox, Image, Secret } from "modal";
import dotenv from "dotenv";
import { Sandbox, Terminal, FileEntry } from "../sandbox.js";

dotenv.config();

export class ModalSandbox extends Sandbox {
  private app: App | null = null;
  protected sandbox: ModalSDKSandbox | null = null;
  private imageId: string | null = null;

  constructor() {
    super();
  }

  private async initApp(): Promise<App> {
    if (!this.app) {
      this.app = await App.lookup("sandboxjs-modal", { createIfMissing: true });
    }
    return this.app;
  }

  async init(id?: string, template?: string): Promise<void> {
    const app = await this.initApp();
    
    const image = id 
      ? new Image(id) 
      : await this.getImageFromTemplate(app, template || "python:3.13-slim");

    this.sandbox = await app.createSandbox(image);
  }

  private async getImageFromTemplate(app: App, template: string): Promise<Image> {
    if (template.startsWith("aws/")) {
      const secretName = process.env.MODAL_AWS_SECRET_NAME;
      if (!secretName) {
        throw new Error("MODAL_AWS_SECRET_NAME environment variable is not set");
      }
      const tag = template.substring(4);
      return await app.imageFromAwsEcr(tag, await Secret.fromName(secretName));
    } else if (template.startsWith("gcp/")) {
      const secretName = process.env.MODAL_GCP_SECRET_NAME;
      if (!secretName) {
        throw new Error("MODAL_GCP_SECRET_NAME environment variable is not set");
      }
      const tag = template.substring(4);
      return await app.imageFromGcpArtifactRegistry(tag, await Secret.fromName(secretName));
    } else {
      let secret = undefined;
      const secretName = process.env.MODAL_DOCKER_SECRET_NAME;
      if (secretName) {
        secret = await Secret.fromName(secretName);
      }
      const tag = template.startsWith("docker/") ? template.substring(7) : template;
      return await app.imageFromRegistry(tag, secret);
    }
  }

  async runCommand(command: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    const process = await this.sandbox.exec(["sh", "-c", command], {
      stdout: "pipe",
      mode: "text"
    });
    return await process.stdout.readText();
  }

  id(): string {
    // Modal sandboxes cannot be accessed by ID, so we use a filesystem image ID
    if (this.imageId) {
        return this.imageId;
    }
    // The image ID only exists after suspending the sandbox
    throw new Error("Sandbox ID can only be retrieved after suspending the sandbox");
  }

  async suspend(): Promise<void> {
    if (!this.sandbox) {
        throw new Error("Sandbox not initialized");
    }

    // Snapshot the filesystem
    const image = await this.sandbox.snapshotFilesystem();
    this.imageId = image.imageId;

    // Terminate the sandbox
    await this.sandbox.terminate();
    this.sandbox = null;
  }

  async resume(): Promise<void> {
    if (!this.imageId) {
      throw new Error("Sandbox not initialized");
    }

    const app = await this.initApp();

    // Create a new sandbox from the filesystem snapshot
    const image = new Image(this.imageId);
    this.sandbox = await app.createSandbox(image);
  }

  async destroy(): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }
    await this.sandbox.terminate();
    this.sandbox = null;
    this.imageId = null;
  }

  async readFile(path: string): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }

    const handle = await this.sandbox.open(path, "r");
    try {
      const content = await handle.read();
      const decoder = new TextDecoder();
      return decoder.decode(content);
    } finally {
      await handle.close();
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }

    const handle = await this.sandbox.open(path, "w");
    try {
      const encoder = new TextEncoder();
      await handle.write(encoder.encode(content));
    } finally {
      await handle.close();
    }
  }

  async getPreviewUrl(port: number): Promise<string> {
    if (!this.sandbox) {
      throw new Error("Sandbox not initialized");
    }

    const tunnels = await this.sandbox.tunnels();
    const tunnel = tunnels[port];
    
    if (!tunnel) {
      throw new Error(`No tunnel found for port ${port}. Make sure the sandbox was created with encryptedPorts: [${port}]`);
    }

    return tunnel.url;
  }

  async listFiles(path: string): Promise<FileEntry[]> {
    throw new Error("Modal sandboxes do not support listing files");
  }

  async moveFile(path: string, newPath: string): Promise<void> {
    throw new Error("Modal sandboxes do not support moving files");
  }

  async deleteFile(path: string): Promise<void> {
    throw new Error("Modal sandboxes do not support deleting files");
  }

  async createDirectory(path: string): Promise<void> {
    throw new Error("Modal sandboxes do not support creating directories");
  }

  async createTerminal(onOutput: (output: string) => void): Promise<Terminal> {
    throw new Error("Modal sandboxes do not support interactive terminals");
  }
}