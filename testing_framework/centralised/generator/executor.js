const fs = require("fs");
const matcher = require("../../../lib/matcher.js");
const client = require("../../../lib/client.js");

var log = LOG.newLayer("Executor_Logs", "Executor_logs", "Logging", 5, 5);
var clientIDs2Alias = new Map();
var matcherIDs2alias = new Map();

//Indexed by the client's alias
var clients = {};

//Indexed by the matcher's alias
var matchers = {};

var instructions = [];

class Instruction {
  constructor(
    type,
    alias,
    isGateway,
    GW_Host,
    GW_port,
    VON_port,
    client_port,
    x_ord,
    y_ord,
    radius,
    channel,
    payload,
    waitTime,
    timeStamp
  ) {
    this.type = type;
    this.options = {
      alias: alias,
      isGateway: isGateway == "true" ? true : false,
      GW_Host: GW_Host,
      GW_port: GW_port,
      VON_port: VON_port,
      client_port: client_port,
      x_ord: x_ord,
      y_ord: y_ord,
      radius: radius,
      channel: channel,
      payload: payload,
      waitTime: waitTime,
      timeStamp: timeStamp,
    };
  }

  executeInstructionObject() {
    return new Promise((resolve, reject) => {
      this.executeInstruction(
        this.type,
        this.options,
        function (successMessage) {
          resolve(successMessage);
        },
        function (failMessage) {
          reject(failMessage);
        }
      );
    });
  }

  async executeInstruction(type, options, success, fail) {
    if (type == "wait") {
      delay(opts.waitTime, function () {
        success("waited for " + opts.waitTime + " milliseconds");
      });
    } else if (type == "newMatcher") {
      if (!matcher.hasOwnProperty(options.alias)) {
        matchers[options.alias] = new matcher(
          options.x_ord,
          options.y_ord,
          options.radius,
          {
            isGateway: options.isGateway,
            GW_Host: options.GW_Host,
            GW_port: options.GW_port,
            VON_port: options.VON_port,
            client_port: options.client_port,
            alias: options.alias,
          },
          function (id) {
            matcherIDs2alias.set(id, options.alias);
            success(
              "Matcher " + options.alias + " created and assigned an ID " + id
            );
          }
        );
      } else {
        fail("There already exists a matcher with that alias");
      }
    } else if (type == "newClient") {
      if (!clients.hasOwnProperty(options.alias)) {
        clients[options.alias] = new client(
          options.GW_Host,
          options.GW_port,
          options.alias,
          options.x_ord,
          options.y_ord,
          options.radius,
          function (id) {
            let m = clients[options.alias].getMatcherID();
            success("Client " + clientAlias + " assigned to matcher with ID: " + m);
          }
        );
      } else {
        fail("There already is a client with that alias");
      }
    } else if (type == "publish") {
      if (clients.hasOwnProperty(options.alias)) {
        clients[options.alias].publish(
          options.x_ord,
          options.y_ord,
          options.radius,
          options.payload,
          options.channel
        );
        success("Client with alias " + options.alias + " published");
      } else {
        fail("There isn't a client with that alias so a publication can't be made");
      }
    } else if (type == "subscribe") {
      if (clients.hasOwnProperty(options.alias))
      {
        clients[options.alias].subscribe(
          options.x_ord,
          options.y_ord,
          options.radius,
          options.channel
        );
        success("Client with alias " + options.alias + " subscribed");
      }
      else
      {
        fail("There isn't a client with that alias so a subscription can't be made")
      }
    } else if (type == "moveClient") {
      if (clients.hasOwnProperty(options.alias))
      {
        clients[options.alias].move(options.x_ord, options.y_ord);
        success("Client with alias " + options.alias + " moved");
      }
      else
      {
        fail("There is no client with that alias so a client move could not be performed");
      }
   
    } else if (type == "end") {
      process.exit(0);
    } else {
      fail("Something went wrong");
    }
  }

  toString() {
    return (
      "INSTRUCTION\nType: " +
      this.type +
      "\nAlias: " +
      this.options.alias +
      "\nisGateway: " +
      this.options.isGateway +
      "\nGW_Host: " +
      this.options.GW_Host +
      "\nGW_port: " +
      this.options.GW_port +
      "\nVON_port: " +
      this.options.VON_port +
      "\nclient_port: " +
      this.options.client_port +
      "\nx_ord: " +
      this.options.x_ord +
      "\ny_ord: " +
      this.options.y_ord +
      "\nradius: " +
      this.options.radius +
      "\nchannel: " +
      this.options.channel +
      "\npayload: " +
      this.options.payload +
      "\nwaitTime: " +
      this.options.waitTime +
      "\nTimestamp: " +
      this.options.timeStamp +
      "\n"
    );
  }
}

function readFile(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return data.toString();
  } catch (error) {
    console.error("Unable to read the file");
  }
}

function extractBetweenQuotes(str) {
  const match = str.match(/"(.*?)"/);
  if (match && match[1]) {
    return match[1];
  }
  return null; // Return null if no match is found
}

function loadInstructions(data) {
  let allInstructions = data.split("\n");
  for (let i = 0; i < allInstructions.length; i++) {
    let instructionString = allInstructions[i];
    let message = extractBetweenQuotes(instructionString);
    if (message != null) {
      let arguments = instructionString.split(" ", 6);
      arguments.push(message);
      let type = arguments[0];
      let alias = arguments[1];
      let x_ord = arguments[2];
      let y_ord = arguments[3];
      let radius = arguments[4];
      let payload = arguments[5];
      let channel = arguments[6];
      instructions.push(
        new Instruction(
          type,
          alias,
          null,
          null,
          null,
          null,
          null,
          parseInt(x_ord),
          parseInt(y_ord),
          parseInt(radius),
          channel,
          payload,
          null,
          null
        )
      );
    } else {
      let arguments = instructionString.split(" ");
      let type = arguments[0];
      if (type == "newMatcher") {
        let alias = arguments[1];
        let isGateway = arguments[2];
        let GW_Host = arguments[3];
        let GW_port = arguments[4];
        let VON_port = arguments[5];
        let client_port = arguments[6];
        let x_ord = arguments[7];
        let y_ord = arguments[8];
        let radius = arguments[9];
        instructions.push(
          new Instruction(
            type,
            alias,
            isGateway,
            GW_Host,
            GW_port,
            VON_port,
            client_port,
            x_ord,
            y_ord,
            radius,
            null,
            null,
            null,
            null
          )
        );
      } else if (type == "newClient") {
        let alias = arguments[1];
        let GW_Host = arguments[2];
        let GW_port = arguments[3];
        let x_ord = arguments[4];
        let y_ord = arguments[5];
        let radius = arguments[6];
        instructions.push(
          new Instruction(
            type,
            alias,
            null,
            GW_Host,
            GW_port,
            null,
            null,
            x_ord,
            y_ord,
            radius,
            null,
            null,
            null,
            null
          )
        );
      } else if (type == "subscribe") {
        let alias = arguments[1];
        let x_ord = arguments[2];
        let y_ord = arguments[3];
        let radius = arguments[4];
        let channel = arguments[5];
        instructions.push(
          new Instruction(
            type,
            alias,
            null,
            null,
            null,
            null,
            null,
            x_ord,
            y_ord,
            radius,
            channel,
            null,
            null,
            null
          )
        );
      } else if (type == "moveClient") {
        let alias = arguments[1];
        let x_ord = arguments[2];
        let y_ord = arguments[3];
        instructions.push(
          new Instruction(
            type,
            alias,
            null,
            null,
            null,
            null,
            null,
            x_ord,
            y_ord,
            null,
            null,
            null,
            null,
            null
          )
        );
      }
      else if (type == "end"){
        instructions.push(new Instruction(type, null, null, null, null, null, null, null, null, null, null, null, null, null));
      }
    }
  }
}

async function executeAllInstructions(step) {
  step = step || 0;

  if (step >= instructions.length) {
    log.debug("Reached end of instructions");
    return;
  }

  try {
    log.debug(
      "Executing instruction " + step + ". Type: " + instructions[step].type
    );
    var result = await instructions[step].executeInstructionObject();
    log.debug(result);
  } catch (error) {
    log.debug("Could not execute instruction" + step + "\t Error: " + error);
  }
  executeAllInstructions(step + 1);
}

let data = readFile("instructions.txt");
loadInstructions(data);

executeAllInstructions();
