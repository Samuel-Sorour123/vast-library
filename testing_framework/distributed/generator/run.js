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

staticAddressLink = { "192.168.0.7": 0, "192.168.0.9": 1, "192.168.0.12": 2, "192.168.0.14": 3, "192.168.0.15": 4 };

const fs = require('fs');
const { spawn, exec } = require('child_process');
const path = require('path');
const os = require('os');
const readline = require('readline');

//const initNVM = 'source ~/.nvm/nvm.sh';
const initNVM = 'source ~/.nvm/nvm.sh && nvm use default && export PATH=$PATH:';

const sshUser = 'pi';

const remoteScriptPath = '~/vast-library/testing_framework/distributed/generator/executor.js';
const filesDestinationPath = '~/vast-library/testing_framework/distributed/generator';
const filesSourcePath = path.resolve(__dirname, 'files');
const eventsDirectory = path.resolve(__dirname, "events");
const simulationDirectory = path.resolve(__dirname, "simulations")
const jsonData = JSON.parse(fs.readFileSync(path.resolve(__dirname, './files/static.json')));

function standardInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close(); // Close the input after receiving the answer
            resolve(answer); // Resolve the promise with the answer
        });
    });
}

function startExecution() {
    const staticIPs = JSON.parse(fs.readFileSync(path.resolve(__dirname, './files/static.json')));
    let command = `ansible-playbook -i inventory run-node-script.yml --extra-vars `;
    let arguments = '\"';
    for (const type in staticIPs) {
        if (type !== "master") {
            for (const alias in staticIPs[type]) {
                runPlaybook(alias);
            }
        } else {
            const executorPath = path.resolve(__dirname, 'executor.js');
            let masterCommand = `node "${executorPath}" master`;
            exec(masterCommand);
        }
    }
}

// Function to run Ansible playbook for a specific alias
function runPlaybook(alias) {
    let hostname, static_IP;
  
    if (jsonData.clients[alias]) {
      hostname = jsonData.clients[alias].hostname;
      static_IP = jsonData.clients[alias].static_IP_address;
    } else if (jsonData.matchers[alias]) {
      hostname = jsonData.matchers[alias].hostname;
      static_IP = jsonData.matchers[alias].static_IP_address;
    } else if (alias === 'master') {
      hostname = jsonData.master.hostname;
      static_IP = jsonData.master.static_IP_address;
    } else {
      console.error(`Alias ${alias} not found`);
      return;
    }
  
    // Construct the command to run Ansible playbook with --extra-vars
    const command = `ansible-playbook -i ./inventory run-node-script.yml --extra-vars "host=${hostname} static_IP=${static_IP} alias=${alias}"`;
  
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
    });
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

    const staticIPs = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'files/static.json')));
    const clientEventsPathRemote = filesDestinationPath + '/logs_and_events/Client_events.txt';

    if (!fs.existsSync(eventsDirectory)) {
        fs.mkdirSync(eventsDirectory);
    }
    for (const alias in staticIPs.clients) {
        const ip = staticIPs.clients[alias].static_IP_address;
        const hostname = staticIPs.clients[alias].hostname;
        const clientEventsFile = hostname + '.txt'
        const scpCommand = ['scp', `${sshUser}@${ip}:${clientEventsPathRemote}`, `${eventsDirectory}/${clientEventsFile}`];
        const child1 = spawn(scpCommand[0], scpCommand.slice(1), { shell: false });

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
                console.log(`Client_events.txt file from ${alias}(${hostname}) was retrieved`);
            } else {
                console.error(`Client_events.txt file from ${alias}(${hostname}) could not be retrieved`);
            }
        });
    }
}

function deleteDirectory(directory) {
    let directoryPath = path.resolve(__dirname, `${directory}`);
    let command = `rm -r "${directoryPath}" || true`;
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.log(`error: ${err}`);
            return;
        }
        if (stderr) {
            console.log("There is no logs and events folder on the master");
            return;
        }
        console.log(`Master successfully deleted the ${directory}`);
    });
}

function deleteDirectoryRemote(directory) {
    const staticIPs = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'files/static.json')));

    for (const type in staticIPs) {
        if (type !== "master") {
            for (const alias in staticIPs[type]) {
                const ip = staticIPs[type][alias].static_IP_address;
                let remoteCommand = `rm -r ${filesDestinationPath}/logs_and_events || true`
                const sshCommand = ['ssh', `${sshUser}@${ip}`, remoteCommand];
                const child1 = spawn(sshCommand[0], sshCommand.slice(1), { shell: false });

                child1.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                child1.stderr.on('data', (data) => {
                    console.error(`stderr: There is no ${directory} folder on ${alias}`);
                });

                child1.on('error', (err) => {
                    console.error(`error: (${alias}): ${err}`);
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

async function merge(simulationName) {
    const allEvents = [];

    // Read all files in the events directory
    const files = fs.readdirSync(eventsDirectory);

    // Process each file
    for (const file of files) {
        // Only process .txt files
        if (path.extname(file) === '.txt') {
            const filePath = path.join(eventsDirectory, file);
            const data = fs.readFileSync(filePath, 'utf8');

            // Split the file content into lines (each line is a JSON object)
            const lines = data.trim().split('\n');

            // Parse each line as JSON and add to the events array
            lines.forEach(line => {
                try {
                    const event = JSON.parse(line);
                    allEvents.push(event);
                } catch (error) {
                    console.error(`Error parsing line in file ${file}:`, line);
                }
            });
        }
    }

    // Sort all events by the "time" property
    allEvents.sort((a, b) => a.time - b.time);

    // Create the output file path using the simulation name
    const outputFilePath = simulationDirectory + `/${simulationName}.txt`;

    // Write sorted events to the output file
    const sortedData = allEvents.map(event => JSON.stringify(event)).join('\n');
    fs.writeFileSync(outputFilePath, sortedData);

    console.log(`Merged and sorted events saved to ${outputFilePath}`);
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
    case 'delete-vast':
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
    case 'collect':
        console.log("Collecting the Client_events.txt files on each Raspberry Pi");
        collectLogFiles();
        break;
    case 'merge': {
        console.log("Merging the Client_event.txt files");
        (async () => {
            const answer = await standardInput('Enter the name of the simulation: ');
            console.log(`You entered: ${answer}`);
            if (!fs.existsSync(simulationDirectory)) {
                fs.mkdirSync(simulationDirectory);
            }
            merge(answer, eventsDirectory, simulationDirectory);
        })();
    };
        break;
    case 'delete-events':
        console.log("Deleting the events directory")
        deleteDirectory('events');
        break;
    case 'delete-logs':
        console.log("Deleting the logs_and_events directory on the master and Raspberry Pis");
        deleteDirectoryRemote('logs_and_events');
        deleteDirectory('logs_and_events');
        break;
    default:
        console.log("Not a valid argument");
}


