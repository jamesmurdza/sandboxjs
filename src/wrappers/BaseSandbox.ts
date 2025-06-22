export interface BaseSandbox {
  // Execute a command in the sandbox and return its output
  run(command: string): Promise<string>;

  // Get the sandbox ID
  id(): string;

  // Initialize a new sandbox instance
  initialize(id?: string): Promise<void>;

  // Pause the sandbox
  pause(): Promise<void>;

  // Resume the sandbox
  resume(): Promise<void>;

  // Stop and destroy the sandbox
  destroy(): Promise<void>;
}
