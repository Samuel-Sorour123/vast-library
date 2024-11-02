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
const { finished } = require('stream');

const info = JSON.parse(fs.readFileSync('./files/static.json'));
const time = info.master.time;
const time1 = info.master.time1
var brokerCount = 0;
var clientCount = 0;

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

const throughputExp = process.argv[3];

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

async function execute(step = 0) {
    if (instructions[step].type === "end") {
        await delay(10000);
        console.log("Finished");
        if (processRunning !== "GW" && processRunning !== "M2") {
            try {
                console.log(`Client ${processRunning} is publishing 'finished'`);
                await new Promise((resolve, reject) => {
                    mqttClient.publish('status', processRunning, { qos: 1 }, (err) => {
                        if (err) {
                            console.log("There was an error publishing 'status':", err);
                            reject(err);
                        } else {
                            console.log("Client has published its identifier:", processRunning);
                            resolve();
                        }
                    });
                });

                // End the MQTT client gracefully
                mqttClient.end(false, {}, () => {
                    console.log('MQTT client disconnected');
                    process.exit(0);
                });
            } catch (error) {
                console.error("Error during client publish and disconnect:", error);
                process.exit(1);
            }
        } else {
            await handleBroker();
            mqttClient.end(false, {}, () => {
                console.log('MQTT client disconnected');
                process.exit(0);
            });
        }
    } else if (instructions[step].type === "wait") {
        try {
            await execute(step + 1);
        } catch (error) {
            log.error("Error during wait step:", error);
        }
    } else {
        try {
            if (processRunning === instructions[step].opts.alias) {
                let result = await executeInstructionWrapper(instructions[step], step);
                if (instructions[step].type != "publish")
                {
                        await delay(time1);
                }
                else
                {
                    if (!throughputExp)
                    {
                        await delay(time);
                    }
                    
                }
               
            }
            await execute(step + 1);
        } catch (error) {
            log.error("Error executing instruction:", error);
        }
    }
}

async function handleBroker() {
    return new Promise((resolve, reject) => {
        mqttClient.subscribe('statusBroker', (err) => {
            if (err) {
                return reject(new Error("Subscription to 'status' topic failed."));
            }

            const onStatusMessage = (topic, message) => {
                console.log("Broker received a message")
                if (topic === 'statusBroker' && message.toString().trim() === 'master') {
                    mqttClient.removeListener('message', onStatusMessage); // Cleanup listener
                    resolve();
                }
            };

            mqttClient.on('message', onStatusMessage);
        });
    });
}


function startMQTT() {
    mqttClient = mqtt.connect(`mqtt://${mqttBrokerAddress}`);
    mqttClient.on('connect', async () => {
        if (processRunning === "master") {
            console.log("Master starting onMasterConnect");
            await onMasterConnect();
        } else {
            console.log("Client starting onClientConnect");
            await onClientConnect();
        }
    });
}

async function onMasterConnect() {
    console.log("Master has entered onMasterConnect")
    const expectedClients = determineExpectedClients();
    console.log("The expected client are: " + expectedClients)
    try {
        console.log("The master is waiting for the clients");
        await waitForClientsReady(expectedClients);
        console.log("The clients are ready");
        mqttClient.unsubscribe('ready', (err) => {
            if (err) {
                console.log("The master could not unsubscribe from ready");
            }
            else {
                console.log("The master successfully unsubscribed from ready");
            }
        });
        // Subscribe to 'status' before starting clients
        await new Promise((resolve, reject) => {
            mqttClient.subscribe('status', (err) => {
                if (err) {
                    reject("Master could not subscribe to 'status' topic");
                } else {
                    log.debug("Master has subscribed to 'status'");
                    resolve();
                }
            });
        });

        mqttClient.publish('instructions', 'start', (err) => {
            if (err) {
                console.log("The master could not publish to instructions");
            }
            else {
                console.log("The master could publish to instructions");
            }
        });

        await waitForClientFinished(expectedClients);
        await delay(300);
        await new Promise((resolve, reject) => {
            mqttClient.publish('statusBroker', 'master',{ qos: 1 }, (err) => {
                if (err) {
                    reject("Master could not publish to status");
                }
                else {
                    resolve("Master could publish to status");
                    console.log("Master could publish to statusBroker");
                }
            });
        });
        process.exit(0);
    } catch (err) {
        console.error("Error while waiting for clients to be ready:", err);
    }
}



function waitForClientsReady(expectedClients) {
    return new Promise((resolve, reject) => {
        let readyClients = [];
        mqttClient.subscribe('ready', (err) => {
            if (err) {
                reject("Master could not subscribe to 'ready' topic");
            } else {
                const onReadyMessage = (topic, message) => {
                    if (topic === 'ready') {
                        const client = message.toString();
                        if (!readyClients.includes(client)) {
                            readyClients.push(client);
                        }
                        if (readyClients.length === expectedClients.length) {
                            mqttClient.removeListener('message', onReadyMessage);
                            mqttClient.unsubscribe('ready');
                            resolve();
                        }
                    }
                };
                mqttClient.on('message', onReadyMessage);
            }
        });
    });
}

function waitForClientFinished(expectedClients) {
    return new Promise((resolve, reject) => {
        let finishedClients = [];
        const expectedFinishedCount = expectedClients.length - clientCount;
        console.log(`Waiting for ${expectedFinishedCount} clients to finish`);

        mqttClient.on('message', onFinishedMessage);

        function onFinishedMessage(topic, message) {
            if (topic === 'status') {
                const client = message.toString();
                console.log(`Master received 'finished' from ${client}`);
                if (!finishedClients.includes(client)) {
                    finishedClients.push(client);
                    if (finishedClients.length === expectedFinishedCount) {
                        mqttClient.removeListener('message', onFinishedMessage);
                        resolve();
                    }
                }
            }
        }
    });
}



async function onClientConnect() {
    try {
        await mqttClient.subscribe('instructions');
        console.log("Client subscribed to instructions");
        mqttClient.on('message', handleClientMessage);
        mqttClient.publish('ready', processRunning);
        console.log("Client has published ready");
    } catch (err) {
        console.error(`${processRunning} could not subscribe to 'instructions':`, err);
    }
}

// Handler for messages received by a client
async function handleClientMessage(topic, message) {
    if (topic === 'instructions') {
        if (message.toString() == 'start') {
            console.log("Clients start executing");
            execute();
        }
        else {
            console.log(`${processRunning} is ending its process`);
            process.exit(0);
        }
    }
}

function determineExpectedClients() {
    let expectedClients = [];
    for (const alias in staticAddresses.clients) {
        expectedClients.push(alias);
        brokerCount = brokerCount + 1;
    }
    for (const alias in staticAddresses.matchers) {
        expectedClients.push(alias);
        clientCount = clientCount + 1;
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


console.log(time);
main(instructionsPath);




