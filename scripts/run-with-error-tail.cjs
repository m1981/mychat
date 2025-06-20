#!/usr/bin/env node
/**
 * Script to run multiple commands in parallel, store logs in separate files,
 * and display the last 10 lines of output for each failed process
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let logDir = path.join(process.cwd(), 'logs');
let keepLogs = false;
let tailLines = 10; // Number of lines to show in summary

// Check for options
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--log-dir' && i + 1 < args.length) {
    logDir = args[i + 1];
    args.splice(i, 2);
    i--;
  } else if (args[i] === '--keep-logs') {
    keepLogs = true;
    args.splice(i, 1);
    i--;
  } else if (args[i] === '--tail' && i + 1 < args.length) {
    tailLines = parseInt(args[i + 1], 10);
    args.splice(i, 2);
    i--;
  }
}

// Ensure log directory exists
fs.mkdirSync(logDir, { recursive: true });

// Parse commands to run
const commands = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--' && i + 2 < args.length) {
    commands.push({
      name: args[i + 1],
      cmd: args[i + 2]
    });
    i += 2;
  } else if (i + 1 < args.length) {
    // Assume format is: name command
    commands.push({
      name: args[i],
      cmd: args[i + 1]
    });
    i += 1;
  }
}

if (commands.length === 0) {
  console.error('Usage: node run-with-logs.js [--log-dir DIR] [--keep-logs] [--tail LINES] [-- NAME COMMAND]...');
  console.error('Example: node run-with-logs.js -- test "pnpm test" -- e2e "pnpm test:e2e"');
  process.exit(1);
}

console.log(`Running ${commands.length} commands with logs stored in ${logDir}`);
commands.forEach(({ name, cmd }) => {
  console.log(`- [${name}]: ${cmd}`);
});

// Track running processes
const processes = [];
let hasFailure = false;
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

// Run each command
commands.forEach(({ name, cmd }) => {
  const logFile = path.join(logDir, `${name}-${timestamp}.log`);
  const logStream = fs.createWriteStream(logFile);

  console.log(`Starting [${name}], logging to ${logFile}`);

  const proc = spawn(cmd, [], { shell: true, stdio: ['inherit', 'pipe', 'pipe'] });
  processes.push({ proc, name, logFile });

  // Write header to log file
  logStream.write(`=== Command: ${cmd} ===\n`);
  logStream.write(`=== Started: ${new Date().toISOString()} ===\n\n`);

  // Process stdout
  proc.stdout.on('data', (data) => {
    const text = data.toString();
    // Output to console with prefix
    process.stdout.write(`[${name}] ${text.replace(/\n/g, `\n[${name}] `)}`);
    // Write raw output to log file
    logStream.write(text);
  });

  // Process stderr
  proc.stderr.on('data', (data) => {
    const text = data.toString();
    // Output to console with prefix
    process.stderr.write(`[${name}] ${text.replace(/\n/g, `\n[${name}] `)}`);
    // Write raw output to log file
    logStream.write(text);
  });

  // Handle process completion
  proc.on('close', (code) => {
    // Write footer to log file
    logStream.write(`\n=== Finished: ${new Date().toISOString()} ===\n`);
    logStream.write(`=== Exit code: ${code} ===\n`);
    logStream.end();

    console.log(`[${name}] Process completed with exit code ${code}`);

    if (code !== 0) {
      hasFailure = true;
    }

    // Check if all processes have completed
    const allDone = processes.every(p => p.proc.exitCode !== null);
    if (allDone) {
      displaySummary();
    }
  });

  // Handle unexpected errors
  proc.on('error', (err) => {
    console.error(`[${name}] Failed to start command: ${err.message}`);
    logStream.write(`\n=== ERROR: ${err.message} ===\n`);
    logStream.end();
    hasFailure = true;
  });
});

// Handle termination signals
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`Received ${signal}, terminating all processes...`);
    processes.forEach(({ proc, name }) => {
      if (proc.exitCode === null) {
        console.log(`Terminating [${name}]...`);
        proc.kill(signal);
      }
    });
  });
});

// Display summary after all processes have completed
function displaySummary() {
  if (hasFailure) {
    console.error('\n\n========== FAILURE SUMMARY ==========');

    // Process each log file to extract the last N lines
    processes.forEach(({ name, logFile, proc }) => {
      if (proc.exitCode !== 0) {
      try {
        const log = fs.readFileSync(logFile, 'utf8');
          const lines = log.split('\n');

          // Get the last N non-empty lines
          const lastLines = lines
            .filter(line => line.trim())
            .slice(-tailLines);

          console.error(`\n[${name}] Last ${tailLines} lines:`);
          lastLines.forEach(line => console.error(`[${name}] ${line}`));
      } catch (err) {
        console.error(`[${name}] Error reading log: ${err.message}`);
      }
      }
    });

    console.error('\n===================================');
    console.error(`Log files are available in: ${logDir}`);
    console.error('===================================\n');
  } else {
    console.log('\n✅ All processes completed successfully!');
  }

  // Clean up log files if not keeping them
  if (!keepLogs && !hasFailure) {
    processes.forEach(({ logFile }) => {
      try {
        fs.unlinkSync(logFile);
      } catch (err) {
        // Ignore errors when deleting log files
      }
    });
  } else if (!keepLogs) {
    console.log('Log files are kept due to errors. Use --keep-logs to always keep logs.');
  }

  // Exit with appropriate code
  process.exit(hasFailure ? 1 : 0);
}
