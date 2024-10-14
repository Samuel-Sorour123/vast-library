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


var log = LOG.newLayer('Simulator_logs', 'Simulator_logs', "logs_and_events", 0, 5);

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

//MQTT client object
var mqttClient;

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

// async function delay(m, callback) {
//     m = m || 100;
//     await new Promise(function () {
//         setTimeout(callback, m);
//     });
// }

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
    mqttClient = mqtt.connect('mqtt://192.168.0.30');
    mqttClient.on('connect', function () {
        if (processRunning == "master") {
            console.log("Master was able to connect to the MQTT broker");
            let expectedClients = determineExpectedClients();
            let readyClients = [];

            mqttClient.subscribe('ready', function (err) {
                if (err) {
                    error("Master could not subscribe to ready");
                }
                else {
                    console.log("Master was able to subscribe to the topic ready");
                    log.debug("Master subscribed to topic ready");
                    mqttClient.on('message', function (topic, message) {
                        if (topic == 'ready') {
                            const client = message.toString();
                            log.debug("Received ready message from client " + client);
                            readyClients.push(client);
                            if (readyClients.length == expectedClients.length) {
                                log.debug("All clients are ready, we can start the execution")
                                mqttClient.unsubscribe('ready');
                                mqttClient.subscribe("logging", function (error) {
                                    if (err) {
                                        error("Master could not subscribe to logging");
                                    }
                                    else {
                                        mqttClient.on('message', async function (topic, message) {
                                            if (topic === 'result') {
                                                console.log("The message is " + message.toString());
                                                let result = message.toString().split(" ");
                                                if (result[0] === 's') {
                                                    console.log("Successful Execution of " + result[1]);
                                                    log.debug('Instruction was successfully executed');
                                                }
                                                else if (result[0] === 'f') {
                                                    log.error('Instruction failed to execute');
                                                    console.log("Failed Execution: " + result[1]);
                                                }
                                            }
                                        });
                                    }
                                });
                                execute(0);
                            }
                        }
                    })
                }

            });
        }
        else {
            mqttClient.subscribe('instructions', function (err) {
                if (err) {
                    error(processRunning + " could not subscribe to instructions");
                }
                else {
                    console.log(processRunning + " was able to subscribe to the topic instructions")
                    listenMQTT();
                    console.log(processRunning + " is listening to the topic instructions");
                    mqttClient.publish('ready', processRunning);
                    console.log(processRunning + " is ready to start executing instructions")
                }
            });
        }
    });
}

function listenMQTT() {
    mqttClient.on('message', async function (topic, message) {
        switch (topic) {
            case 'instructions': {
                console.log(processRunning + " has received the message " + message.toString() + " from the instructions topic");
                const step = parseInt(message.toString(), 10);
                if (!isNaN(step) && (step < instructions.length)) {
                    const instruction = instructions[step];
                    let alias = '';
                    if (instruction.opts && instruction.opts.alias) {
                        alias = instruction.opts.alias;
                    }
                    else {
                        return;
                    }
                    if (alias == processRunning) {
                        try {
                            console.log("The alias " + processRunning + " matches up with the alias of the instruction");
                             const result = await executeInstructionWrapper(instruction, step);
                            log.debug(result);
                            console.log(processRunning + " execution status: " + result);
                            console.debug(processRunning + " executes step" + step);
                            let message = `s step ${step}`;
                            mqttClient.publish('result', message, function (err) {
                                if (err) {
                                    console.log(processRunning + " was unable to publish the execution message:" + message);
                                }
                                else {
                                    console.log(processRunning + " was able to publish the execution message:" + message);
                                }
                            });

                        } catch (error) {

                            console.error(`${processRunning} failed to execute step ${step}:`, err);
    
                            let message = `f step${step}`;
                            mqttClient.publish('result', message, function (err) {
                                if (err) {
                                    console.log(`${processRunning} was unable to publish the message: ${message}`);
                                } else {
                                    console.log(`${processRunning} was able to publish the message: ${message}`);
                                }
                            });
                        }
                    }
                    else {
                        log.debug("The alias " + alias + " does not match up with" + processRunning + " so we ignore");
                    }
                }
                else {
                    error("The step is out of bounds: " + step);
                }
            }
                break;
            case 'end': {
                if (message.toString() == 'stop') {
                    console.log(processRunning + " has stopped executing as there are no more instructions");
                    process.exit(0);
                }
            }
        }

    });


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


console.log("The process running is " + processRunning);
main(instructionsPath);


