import { Client } from 'ssh2';
import { RunCommandOptions } from '../../sandbox.js';

export interface SSHConfig {
  host: string;
  port?: number;
  username: string;
  password?: string;
  privateKey?: Buffer;
  passphrase?: string;
}

export class SSHClient {
  private conn: Client;

  constructor() {
    this.conn = new Client();
  }

  connect(config: SSHConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conn.on('ready', () => {
        console.log('SSH Connection established');
        resolve();
      });

      this.conn.on('error', (err) => {
        reject(err);
      });

      this.conn.connect({
        host: config.host,
        port: config.port || 22,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase,
      });
    });
  }

  async executeCommand(
    command: string,
    options?: RunCommandOptions & { background?: false }
  ): Promise<{ exitCode: number; output: string }>;
  async executeCommand(
    command: string,
    options?: RunCommandOptions & { background: true }
  ): Promise<{ pid: number }>;
  async executeCommand(
    command: string,
    options?: RunCommandOptions & { background?: boolean }
  ): Promise<{ exitCode: number; output: string } | { pid: number }> {
    return new Promise((resolve, reject) => {
      let finalCommand: string;
      
      if (options?.background) {
        finalCommand = `nohup sh -c '${command}' > /dev/null 2>&1 & echo $!`;
      } else {
        // Wrap command to capture exit code reliably
        finalCommand = `${command}; echo "EXIT_CODE:$?"`;
      }
      
      this.conn.exec(finalCommand, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }
  
        if (options?.background) {
          let pidOutput = '';
          
          stream
            .on('close', () => {
              const pid = parseInt(pidOutput.trim());
              if (isNaN(pid)) {
                reject(new Error('Failed to get process PID'));
              } else {
                resolve({ pid });
              }
            })
            .on('data', (data: Buffer) => {
              pidOutput += data.toString();
            });
        } else {
          let output = '';
          let errorOutput = '';
  
          stream
            .on('close', () => {
              // Parse exit code by searching from the end
              const lines = output.split('\n');
              let exitCodeLineIndex = -1;
              let exitCode = 0;

              for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].startsWith('EXIT_CODE:')) {
                  exitCodeLineIndex = i;
                  exitCode = parseInt(lines[i].split(':')[1]) || 0;
                  break;
                }
              }

              if (exitCodeLineIndex !== -1) {
                // Remove the exit code line from output
                lines.splice(exitCodeLineIndex, 1);
                output = lines.join('\n');
              }
              
              resolve({ 
                exitCode, 
                output: output + (errorOutput ? '\nSTDERR:\n' + errorOutput : '')
              });
            })
            .on('data', (data: Buffer) => {
              output += data.toString();
            })
            .stderr.on('data', (data: Buffer) => {
              errorOutput += data.toString();
            });
        }
      });
    });
  }

  disconnect(): void {
    this.conn.end();
    console.log('SSH Connection closed');
  }
}
