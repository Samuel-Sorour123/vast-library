// CF Marais December 2021
// A discrete event simulator for VAST, used for code verification and bug finding

// imports
const matcher = require('../../../lib/matcher.js');
const client = require('../../../lib/client.js');
const fs = require('fs');
const readline = require('readline');
const mqtt = require('mqtt');
const { map, data } = require('jquery');
const path = require('path');
const { start } = require('repl');


// Data structures to store matchers
// alias --> matcher{}.
var matchers = {};
var matcherIDs2alias = {};
var clients = {};
var clientIDs2alias = {};
var instructions = [];

const instructionsPath = path.resolve(__dirname, "files/instructions.txt");
const staticPath = path.resolve(__dirname, "files/static.json");
const processRunning = process.argv[2] || "master";
const staticAddresses = JSON.parse(fs.readFileSync(staticPath));
const matcherLogsAndEvents = path.resolve(__dirname, "logging/");

//MQTT client object
var mqttClient;
const mqttBrokerAddress = staticAddresses.master.static_IP_address;

// Interpret and execute instruction
async function executeInstruction(instruction, step, success, fail) {
    var opts = instruction.opts;
    var type = instruction.type;

    switch (type) {

        case 'wait': {
            await delay(opts.waitTime);
            success('waited for ' + opts.waitTime + ' milliseconds');
        }
            break;

        case 'newMatcher': {

            if (!matchers.hasOwnProperty(opts.alias)) {

                matchers[opts.alias] = new matcher(opts.x, opts.y, opts.radius,
                    {
                        isGateway: opts.isGateway,
                        GW_host: opts.GW_host,
                        GW_port: opts.GW_port,
                        VON_port: opts.VON_port,
                        client_port: opts.client_port,
                        alias: opts.alias,
                        //logLayer: 'Matcher_' + opts.alias,
                        //logFile: 'Matcher_' + opts.alias,
                        logDirectory: matcherLogsAndEvents,
                        eventsDirectory: matcherLogsAndEvents,
                        logDisplayLevel: 5,
                        logRecordLevel: 5,
                        eventDisplayLevel: 5,
                        eventRecordLevel: 5
                    },
                    function (id) {
                        matcherIDs2alias[id] = opts.alias;
                        success('Matcher: ' + opts.alias + ' created with ID: ' + id);
                    }
                );
            }
            else {
                fail('Matcher already exists with alias: ' + opts.alias);
            }
        }
            break;

        case 'newClient': {
            if (!clients.hasOwnProperty(opts.alias)) {

                clients[opts.alias] = new client(opts.host, opts.port, opts.alias, opts.x, opts.y, opts.radius, function (id) {
                    clientIDs2alias[id] = opts.alias;
                    clients[opts.alias].setAlias = opts.alias;
                    let m = clients[opts.alias].getMatcherID();
                    success('Client ' + opts.alias + ' assigned to matcher: ' + matcherIDs2alias[m]);
                });
            }
            else {
                fail('client already exists with alias: ' + alias);
            }
        }
            break;

        case 'subscribe': {

            if (clients.hasOwnProperty(opts.alias)) {
                clients[opts.alias].subscribe(opts.x, opts.y, opts.radius, opts.channel);
                success(opts.alias + ': added subscription:', opts.x, opts.y, opts.radius, opts.channel);
            }
            else {
                fail('Invalid client alias for subscription: ' + opts.alias);
            }
        }
            break;

        case 'publish': {

            if (clients.hasOwnProperty(opts.alias)) {
                clients[opts.alias].publish(opts.x, opts.y, opts.radius, opts.payload, opts.channel);
                success(opts.alias + ' published:', opts.payload, 'on channel: ' + opts.channel)
            }
            else {
                fail('client with alias "' + opts.alias + '" does not exist');
            }
        }
            break;

        case 'moveClient': {

            if (clients.hasOwnProperty(opts.alias)) {
                clients[opts.alias].move(opts.x, opts.y);
                success(opts.alias + ' request move to [' + opts.x + '; ' + opts.y + ']');
            }
            else {
                fail('client with alias "' + alias + '" does not exist');
            }
        }
            break;

        case 'end': {
            mqttClient.publish('end', 'stop');
            success('End instruction executed');
        }
            break;

        default: {
            fail('instruction at step ' + step + 'is not valid');
        }
    }
}

// A function wrapper used to execute steps synchronously using a promise
var executeInstructionWrapper = function (instruction, step) {
    return new Promise(function (resolve, reject) {

        executeInstruction(instruction, step,
            function (successResponse) {
                resolve(successResponse);
            },

            function (failResponse) {
                reject(failResponse);
            });
    });
}

async function execute(step) {
    step = step || 0;

    if (step == 0) {
        console.log("Master starts executing the instructions");
    }

    if (instructions[step].type == "end") {
        log.debug('Executing the end instruction')
        let result = await executeInstructionWrapper(instructions[step], step);
        log.debug(result);
        console.log("Master has finished executing the instructions");

        mqttClient.publish('instructions', 'end');
        setTimeout(() => process.exit(0), 100);
        return;
    }
    else if (instructions[step].type == "wait") {
        try {
            log.debug('Executing wait instruction with step ' + step + ': Waiting ' + instructions[step].opts.waitTime);
            let result = await executeInstructionWrapper(instructions[step], step);
            log.debug(result);
            execute(step + 1);
        }
        catch (error) {
            log.error(error);
        }
    }
    else {
        try {
            log.debug('Publishing instruction ' + step + '. Type: ' + instructions[step].type);
            mqttClient.publish('instructions', step.toString());
            execute(step + 1);
        }
        catch (error) {
            log.error("Could not publish instruction with step " + step);
        }
    }

}


function delay(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

//function to obtain all the data from a text file
var dataFromTextFiles = async (filename) => {
    try {
        var dataFromTextFile = [];
        const fileStream = fs.createReadStream(filename);

        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });
        // Note: we use the crlfDelay option to recognize all instances of CR LF
        // ('\r\n') in input.txt as a single line break.

        for await (const data of rl) {
            var dataLine = [];
            var cur = "";
            var isString = 0;

            for (var d of data) {
                if (d == '"') {
                    isString = 1 - isString;
                }

                else if (isString == 1) {
                    cur += d;
                }

                else if (
                    (d >= "a" && d <= "z") || (d >= "A" && d <= "Z") ||
                    (d >= "0" && d <= "9") || (d == "/")) {
                    cur += d;
                }

                else {
                    if (cur.length != 0)
                        dataLine.push(cur);

                    cur = "";
                }
            }
            if (cur.length != 0)
                dataLine.push(cur);

            dataFromTextFile.push(dataLine);
        }

        return dataFromTextFile;
    } catch (e) {
        log.error("Error:", e.stack);
    }
};

async function main(filename) {
    var dataFromTextFile = await dataFromTextFiles(filename);

    if (!dataFromTextFile) {
        log.error("Failed to load instructions from file");
        process.exit(1);
    }

    var i = 1;  // line counter
    dataFromTextFile.map((dataFromTextFile) => {
        switch (dataFromTextFile[0]) {

            case "wait": {
                if (dataFromTextFile.length != 2) {
                    error(`wrong input in line number ${i}`);
                }
                else {
                    instructions.push(new instruction(dataFromTextFile[0],
                        {
                            waitTime: dataFromTextFile[1]
                        }
                    ));
                }
                i++;
            }
                break;

            case "newMatcher": {
                if (dataFromTextFile.length != 10) {
                    error(`wrong input in line number ${i}`);
                } else {
                    instructions.push(
                        new instruction(dataFromTextFile[0], {
                            alias: dataFromTextFile[1],
                            isGateway: dataFromTextFile[2] == "true" ? true : false,
                            GW_host: dataFromTextFile[3],
                            GW_port: Number(dataFromTextFile[4]),
                            VON_port: Number(dataFromTextFile[5]),
                            client_port: Number(dataFromTextFile[6]),
                            x: Number(dataFromTextFile[7]),
                            y: Number(dataFromTextFile[8]),
                            radius: Number(dataFromTextFile[9]),
                        })
                    );
                }
                i++;
            }
                break;

            case "newClient": {
                if (dataFromTextFile.length != 7) {
                    error(`wrong input in line number ${i}`);
                } else {
                    instructions.push(
                        new instruction(dataFromTextFile[0], {
                            alias: dataFromTextFile[1],
                            host: dataFromTextFile[2],
                            port: Number(dataFromTextFile[3]),
                            x: Number(dataFromTextFile[4]),
                            y: Number(dataFromTextFile[5]),
                            radius: Number(dataFromTextFile[6]),
                        })
                    );
                }
                i++;
            }
                break;

            case "subscribe": {
                if (dataFromTextFile.length != 6) {
                    error(`wrong input in line number ${i}`);
                } else {
                    instructions.push(
                        new instruction(dataFromTextFile[0], {
                            alias: dataFromTextFile[1],
                            x: Number(dataFromTextFile[2]),
                            y: Number(dataFromTextFile[3]),
                            radius: Number(dataFromTextFile[4]),
                            channel: dataFromTextFile[5],
                        })
                    );
                }
                i++;
            }
                break;

            case "publish": {
                if (dataFromTextFile.length != 7) {
                    error(`wrong input in line number ${i}`);
                } else {
                    instructions.push(
                        new instruction(dataFromTextFile[0], {
                            alias: dataFromTextFile[1],
                            x: Number(dataFromTextFile[2]),
                            y: Number(dataFromTextFile[3]),
                            radius: Number(dataFromTextFile[4]),
                            channel: dataFromTextFile[5],
                            payload: dataFromTextFile[6],
                        })
                    );
                }
                i++;
            }
                break;

            case "moveClient": {
                if (dataFromTextFile.length != 4) {
                    error(`wrong input in line number ${i}`);
                } else {
                    instructions.push(
                        new instruction(dataFromTextFile[0], {
                            alias: dataFromTextFile[1],
                            x: Number(dataFromTextFile[2]),
                            y: Number(dataFromTextFile[3])
                        })
                    );
                }
                i++;
            }
                break;

            // instruction to end simulation
            case "end": {
                instructions.push(new instruction(dataFromTextFile[0]));
                return;
            }

            default: {
                // NOT a comment or empty line, alert user and end process
                if (dataFromTextFile.length > 0 && !dataFromTextFile[0].startsWith('//')) {
                    error(`Unrecognised Input in line number ${i}`);
                }
                i++;
                break;
            }
        };
    });

    // start executing once all instructions loaded
    startMQTT();

}


var error = function (message) {
    log.error(message);
    process.exit();
}

var instruction = function (type, opts) {
    this.type = type;
    this.opts = opts;
}

function startMQTT() {
    mqttClient = mqtt.connect(`mqtt://${mqttBrokerAddress}`);

    mqttClient.on('connect', async () => {
        if (processRunning === "master") {
            await onMasterConnect();
        } else {
            await onClientConnect();
        }
    });
}

// Function called when the master connects to the MQTT broker
async function onMasterConnect() {
    const expectedClients = determineExpectedClients();
    try {
        // Wait for all clients to be ready
        await waitForClientsReady(expectedClients);
        log.debug("All the clients have published \'ready\'");
        // After all clients are ready, proceed

        await mqttClient.unsubscribe('ready');
        // console.log("Master unsubscribed from 'ready' topic");
        log.debug("Unsubscribed from ready");
        // Subscribe to 'logging' topic
        await mqttClient.subscribe('result');
        log.debug("Subscribed to \'result\'");
        // console.log("Master subscribed to 'logging' topic");

        // Set up message handler for 'logging' messages
        mqttClient.on('message', handleMasterMessage);

        // Start execution
        execute(0);

    } catch (err) {
        console.error("Error while waiting for clients to be ready:", err);
    }
}

// Function to wait for all clients to be ready
function waitForClientsReady(expectedClients) {
    return new Promise((resolve, reject) => {
        let readyClients = [];

        // Subscribe to 'ready' topic
        mqttClient.subscribe('ready', (err) => {
            if (err) {
                reject("Master could not subscribe to 'ready' topic");
            } else {
                //  console.log("Master subscribed to 'ready' topic");

                // Message handler for 'ready' messages
                const onReadyMessage = (topic, message) => {
                    if (topic === 'ready') {
                        const client = message.toString();
                        //  console.log(`Received 'ready' message from client: ${client}`);

                        if (!readyClients.includes(client)) {
                            readyClients.push(client);
                        }

                        // Check if all expected clients are ready
                        if (readyClients.length === expectedClients.length) {
                            //    console.log("All clients are ready");

                            // Remove the 'message' listener for 'ready' messages
                            mqttClient.removeListener('message', onReadyMessage);
                            resolve();
                        }
                    }
                };

                // Attach the message handler
                mqttClient.on('message', onReadyMessage);
            }
        });
    });
}

// Handler for messages received by the master
function handleMasterMessage(topic, message) {
    if (topic === 'result') {
        const payload = message.toString();
        const payloadArray = payload.split(" ");
        const result = payloadArray[0];
        const step = payloadArray[1] + " " + payloadArray[2];
        //console.log(`Master received message on 'result': ${message}`);
        //console.log("The payload is " + payload);
        if (result === 'success') {
            log.debug("Instruction success: " + step);
            //  console.log("Instruction success: " + step);
        } else if (result === 'fail') {
            log.error("Instruction fail: " + step);
            //  console.log("Instruction fail: " + step);
        }
    }
}

// Function called when a client connects to the MQTT broker
async function onClientConnect() {
    try {

        await mqttClient.subscribe('instructions');
        //console.log(`${processRunning} subscribed to 'instructions' topic`);
        log.debug(`${processRunning} subscribed to 'instructions' topic`);

        // Set up message handler for 'instructions' messages
        mqttClient.on('message', handleClientMessage);

        // Notify master that this client is ready
        mqttClient.publish('ready', processRunning);
        log.debug(`${processRunning} published 'ready' message`);
        //console.log(`${processRunning} published 'ready' message`);
    } catch (err) {
        console.error(`${processRunning} could not subscribe to 'instructions':`, err);
    }
}

// Handler for messages received by a client
async function handleClientMessage(topic, message) {
    if (topic === 'instructions') {
        if (message.toString() !== 'end')
        {
            const step = parseInt(message.toString(), 10);
            //console.log(`${processRunning} received instruction ${step}`);
            log.debug(`${processRunning} received instruction ${step}`);

            const instruction = instructions[step];
            const alias = instruction.opts?.alias || '';

            if (alias === processRunning) {
                try {
                    log.debug(`${processRunning} is about to execute instruction ${step}:`);
                    //console.log(`${processRunning} is about to execute instruction ${step}:`);
                    //console.log(`Instruction ${instruction}`);
                    log.debug(`Instruction ${instruction}`);

                    const result = await executeInstructionWrapper(instruction, step);

                    log.debug(`${processRunning} executed instruction ${step}:`, result);
                    //console.log(`${processRunning} executed instruction ${step}:`, result);

                    mqttClient.publish('result', `success instruction ${step}`, function (err) {
                        if (err) {
                            log.debug(`Failed to publish success step ${step}`);
                            //console.log(`Failed to publish success step${step}`); 
                        }
                        else {
                            log.debug(`Succeeded with publishing success step ${step}`);
                            //console.log(`Succeeded with publishing success step${step}`);
                        }
                    });
                } catch (err) {
                    //console.error(`${processRunning} failed to execute step ${step}:`, err);
                    log.debug(`${processRunning} failed to execute step ${step}:`, err);
                    mqttClient.publish('result', `fail instruction ${step}`);
                }
            } else {
                log.debug(`Instruction alias ${alias} does not match ${processRunning}, ignoring`);
                //console.log(`Instruction alias '${alias}' does not match '${processRunning}', ignoring`);
            }
        }
        else
        {
            console.log(`${processRunning} is ending its process`);
            process.exit(0);
        }
    }
}

function determineExpectedClients() {
    let expectedClients = [];
    for (const alias in staticAddresses.clients) {
        expectedClients.push(alias);
    }
    for (const alias in staticAddresses.matchers) {
        expectedClients.push(alias);
    }
    return expectedClients;
}

var log;
if (processRunning === 'master') {
    log = LOG.newLayer('Master_Simulator_logs', 'Master_Simulator_logs', "logs_and_events", 0, 5);
} else {
    log = LOG.newLayer(`${processRunning}_Simulator_logs`, `${processRunning}_Simulator_logs`, "logs_and_events", 0, 5);
}

console.log("The process running is " + processRunning);
console.log("Node.js version is " + process.version);
main(instructionsPath);


