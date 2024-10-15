/**
 * run.js
 *
 * This script automates running experiments.
 * It generates a list of instructions that should be executed by nodes on the network.
 * It sends the text file containing the list of instructions and the static IP address information to each node on the network.
 * It starts the executor.js script on each node.
 * After the simulation has run to completion, it retrieves all the log files generated by each node on the network.
 * It then merges all of the logging files into one file.
 * The key metric tools can then use this logging file to evaluate the quality of the spatial publish protocol.
 * The options.json file is used to specify the arguments of each script.
 */

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const initNVM = 'source ~/.nvm/nvm.sh';
const os = require('os');


const remoteScriptPath = '~/vast-library/testing_framework/distributed/generator/executor.js';
const sshUser = 'pi';

const filesDestinationPath = '~/vast-library/testing_framework/distributed/generator';
const filesSourcePath = path.resolve(__dirname, 'files');

function startExecution() {
    const staticIPs = JSON.parse(fs.readFileSync(path.resolve(__dirname, './files/static.json')));

    for (const type in staticIPs) {
        if (type === "master") {
            const executorPath = path.resolve(__dirname, 'executor2.js');
            const child = spawn('node', [executorPath, 'master'], { cwd: __dirname });

            child.stdout.on('data', (data) => {
                console.log(`stdout (master): ${data}`);
            });

            child.stderr.on('data', (data) => {
                console.error(`stderr (master): ${data}`);
            });

            child.on('error', (err) => {
                console.error(`The executor.js script could not be started with the argument master: ${err}`);
            });

            child.on('close', (code) => {
                if (code === 0) {
                    console.log('The script executor.js master executed successfully.');
                    process.exit(0);
                } else {
                    console.error(`Master process exited with code ${code}`);
                }
            });
        } else {
            for (const alias in staticIPs[type]) {
                const ip = staticIPs[type][alias].static_IP_address;

                // Properly quote paths and commands
                const remoteCommand = `${initNVM} && node ${remoteScriptPath} ${alias}`;
                const sshCommand = ['ssh', `${sshUser}@${ip}`, remoteCommand];
                const child = spawn(sshCommand[0], sshCommand.slice(1), { shell: false });

                child.stdout.on('data', (data) => {
                    console.log(`stdout (${alias}): ${data}`);
                });

                child.stderr.on('data', (data) => {
                    console.error(`stderr (${alias}): ${data}`);
                });

                child.on('error', (err) => {
                    console.error(`There was an error executing the command line arguments for ${alias}: ${err}`);
                });

                child.on('close', (code) => {
                    if (code === 0) {
                        console.log(`Execution for ${alias} completed successfully.`);
                    } else {
                        console.error(`Child process for ${alias} exited with code ${code}`);
                    }
                });
            }
        }
    }
}

function sendFiles() {
    const staticIPs = JSON.parse(fs.readFileSync(path.resolve(__dirname, './files/static.json')));

    for (const type in staticIPs) {
        if (type !== "master") {
            for (const alias in staticIPs[type]) {
                const ip = staticIPs[type][alias].static_IP_address;

                // Send files
                const instructionCommand = ['scp', '-r', filesSourcePath, `${sshUser}@${ip}:${filesDestinationPath}`];
                const child1 = spawn(instructionCommand[0], instructionCommand.slice(1), { shell: false });

                child1.stdout.on('data', (data) => {
                    console.log(`stdout (scp instructions to ${alias}): ${data}`);
                });

                child1.stderr.on('data', (data) => {
                    console.error(`stderr (scp instructions to ${alias}): ${data}`);
                });

                child1.on('error', (err) => {
                    console.error(`There was an error executing the instruction copy command for ${alias}: ${err}`);
                });

                child1.on('close', (code) => {
                    if (code === 0) {
                        console.log(`The instructions.txt file was sent to ${alias}`);
                    } else {
                        console.error(`scp process for instructions.txt to ${alias} exited with code ${code}`);
                    }
                });
            }
        }
    }
}

function generateInstructions() {
    const generatorPath = path.resolve(__dirname, 'generator.js');
    const infoJsonPath = path.resolve(__dirname, 'info.json');
    const child = spawn('node', [generatorPath, infoJsonPath], { cwd: __dirname });

    child.stdout.on('data', (data) => {
        console.log(`stdout (generator): ${data}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`stderr (generator): ${data}`);
    });

    child.on('error', (err) => {
        console.error(`There was an issue executing the generator.js script: ${err}`);
    });

    child.on('close', (code) => {
        if (code === 0) {
            console.log("Instructions were generated successfully.");
        } else {
            console.error(`Generator process exited with code ${code}`);
        }
    });
}

function collectLogFiles() {
    // Implementation needed
}

function deleteLogFiles() {
    // Implementation needed
}

function ssh(command, directory = "~/") {
    const staticIPs = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'files/static.json')));

    for (const type in staticIPs) {
        if (type !== "master") {
            for (const alias in staticIPs[type]) {
                const ip = staticIPs[type][alias].static_IP_address;
                let remoteCommand = command;
                if (directory !== "~/") {
                    remoteCommand = `cd ${directory} && ${command}`
                }
                const sshCommand = ['ssh', `${sshUser}@${ip}`, remoteCommand];
                const child1 = spawn(sshCommand[0], sshCommand.slice(1), { shell: false });

                child1.stdout.on('data', (data) => {
                    console.log(`stdout: ${command} (${alias}): ${data}`);
                });

                child1.stderr.on('data', (data) => {
                    console.error(`stderr: ${command} (${alias}): ${data}`);
                });

                child1.on('error', (err) => {
                    console.error(`error: ${command} (${alias}): ${err}`);
                });

                child1.on('close', (code) => {
                    if (code === 0) {
                        console.log(`${command} was successful on ${alias}`);
                    } else {
                        console.error(`${command} was unsuccessful on ${alias} exited with code ${code}`);
                    }
                });
            }
        }
    }
}

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'generate':
        console.log("Generating the list of instructions");
        generateInstructions();
        break;
    case 'send':
        console.log("Sending the instruction.txt and static.json files to each Raspberry Pi");
        sendFiles();
        break;
    case 'execute':
        console.log("Running the simulation");
        startExecution();
        break;
    case 'fetch':
        console.log("Collecting log files");
        collectLogFiles();
        break;
    case 'delete':
        console.log("Deleting current vast-library");
        ssh(`rm -rf vast-library || true`);

        break;
    case 'download':
        console.log("Downloading the latest vast-library");
        ssh("git clone https://github.com/Samuel-Sorour123/vast-library.git");
        break;
    case 'install':
        console.log("Installing the neccessary packages");
        ssh(`${initNVM} && npm install`, '~/vast-library');
        break;
    default:
        console.log("Not a valid argument");
}
