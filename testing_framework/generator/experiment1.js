const { match } = require("assert");
const fs = require("fs");
const { getSystemErrorMap } = require("util");
//Running an experiment on a single host (Matchers and clients are stationary)
//The script generates a text file that the simulator uses to run a simulation

const channels = ["channel1", "channel2", "channel3"];
const payloadLength = [5, 20];
const asciiValueRange = [20, 126];

class Matcher {
  constructor(
    matcherID,
    isGateway,
    gatewayHost,
    gatewayPort,
    vonPort,
    clientPort,
    xCoord,
    yCoord,
    radius
  ) {
    this.matcherID = matcherID;
    this.isGateway = isGateway;
    this.gatewayHost = gatewayHost;
    this.gatewayPort = gatewayPort;
    this.vonPort = vonPort;
    this.clientPort = clientPort;
    this.xCoord = xCoord;
    this.yCoord = yCoord;
    this.radius = radius;
  }

  fetchInstruction() {
    let string =
      "newMatcher " +
      this.matcherID +
      " " +
      this.isGateway +
      " " +
      this.gatewayHost +
      " " +
      this.gatewayPort +
      " " +
      this.vonPort +
      " " +
      this.clientPort +
      " " +
      this.xCoord.toString() +
      " " +
      this.yCoord.toString() +
      " " +
      this.radius.toString();
      return string;
  }
}

class Client {
  constructor(clientID, gatewayHost, gatewayPort, xCoord, yCoord, radius) {
    this.clientID = clientID;
    this.gatewayHost = gatewayHost;
    this.gatewayPort = gatewayPort;
    this.xCoord = xCoord;
    this.yCoord = yCoord;
    this.radius = radius;
  }

  fetchInstruction() {
    let string =
      "newClient " +
      this.clientID +
      " " +
      this.gatewayHost +
      " " +
      this.gatewayPort +
      " " +
      this.xCoord.toString() +
      " " +
      this.yCoord.toString() +
      " " +
      this.radius.toString();
      return string;
  }
}

function writeFile(filename, instructions) {
  fs.writeFile(filename, instructions, function callback(err) {
    if (err) {
      // An error occurred during the file write operation
      console.error("Error writing to file", err);
    } else {
      // File was written successfully
      console.log("File written successfully");
    }
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  let randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNumber;
}

function sumProbabilitiesUpToIndex(probabilities, index) {
  const subArray = probabilities.slice(0, index + 1);
  const sum = subArray.reduce(
    (accumulator, currentValue) => accumulator + currentValue,
    0
  );
  return sum;
}

function probabilisticChoice(probabilities) {
  let sum = probabilities.reduce(
    (accumulator, current) => accumulator + current,
    0
  );
  if (sum != 1) {
    throw new Error("Probabilities must add up to 1");
  }

  let index = 0;
  const randomNumber = Math.random();

  while (index < probabilities.length) {
    if (randomNumber < sumProbabilitiesUpToIndex(probabilities, index)) {
      return index;
    }
    index++;
  }
}

function generateRandomPayload(minCharacter, maxCharacters) {
  const numCharacters = getRandomInt(minCharacter, maxCharacters);
  let payload = "";
  for (let i = 0; i < numCharacters; i++) {
    let asciiValue = getRandomInt(asciiValueRange[0], asciiValueRange[1]);
    let asciiCharacter = String.fromCharCode(asciiValue);
    payload = payload + asciiCharacter;
  }
  return payload;
}

function generateWaitInsruction(minLength, maxLength) {
  let length = getRandomInt(minLength, maxLength);
  let instruction = "wait " + length.toString();
}

function createMatchers(numMatchers) {
  for (let m = 1; m <= numMatchers; m++) {
    let r = getRandomInt(0, 100);
    let x = getRandomInt(0, 1000);
    let y = getRandomInt(0, 1000);

    if (m == 1) {
      let matcher = new Matcher(
        "GW",
        true,
        "localhost",
        "8000",
        "8001",
        "20000",
        x,
        y,
        r
      );
      matchers["GW"] = matcher;
    } else {
      let matcherID = "M" + m.toString();
      let vonPort = ((m - 1) * 10 + 8000).toString();
      let clientPort = ((m - 1) * 10 + 20000).toString();
      let matcher = new Matcher(
        matcherID,
        false,
        "localhost",
        "8000",
        vonPort,
        clientPort,
        x,
        y,
        r
      );
      matchers[matcherID] = matcher;
    }
  }
}

function createClients(numClients) {
  var instructions = "";

  for (let c = 1; c <= numClients; c++) {
    let r = getRandomInt(0, 100);
    let x = getRandomInt(0, 1000);
    let y = getRandomInt(0, 1000);
    let clientID = "C" + c.toString();
    let client = new Client(clientID, "localhost", "20000", x, y, r);
    clients[clientID] = client;
  }
  return instructions;
}

function fetchRandomPublicationString() {
  let publication = "publish ";
  let r = getRandomInt(1, 300).toString();
  let x = getRandomInt(r, 1000 - r).toString();
  let y = getRandomInt(r, 1000 - r).toString();
  let channelIndex = getRandomInt(0, channels.length - 1);
  let channel = channels[channelIndex];
  let payload = generateRandomPayload(payloadLength[0], payloadLength[1]);
  let clientKeyArray = Object.keys(clients);
  let clientID = clientKeyArray[getRandomInt(0, clientKeyArray.length - 1)];
  publication =
    publication +
    clientID +
    " " +
    x +
    " " +
    y +
    " " +
    r +
    " " +
    channel +
    " " +
    payload;
  return publication;
}

function fetchRandomSubscriptionString() {
  let subscription = "subscribe ";
  let r = getRandomInt(1, 300).toString();
  let x = getRandomInt(r, 1000 - r).toString();
  let y = getRandomInt(r, 1000 - r).toString();
  let channelIndex = getRandomInt(0, channels.length - 1);
  let channel = channels[channelIndex];
  let clientKeyArray = Object.keys(clients);
  let clientID = clientKeyArray[getRandomInt(0, clientKeyArray.length - 1)];
  subscription =
    subscription + clientID + " " + x + " " + y + " " + r + " " + channel;
  return subscription;
}

function fetchInstructionSet(
  numPublications,
  numSubscriptions
) {
  
  let instructions = "";
  let matcherIDArray = Object.keys(matchers);
  let clientIDArray = Object.keys(clients);

  for (let i = 0; i < matcherIDArray.length; i++)
  {
    instructions = instructions + "\n" + matchers[matcherIDArray[i]].fetchInstruction();
  }

  for (let j = 0; j < clientIDArray.length; j++)
  {
    instructions = instructions + "\n" + clients[clientIDArray[j]].fetchInstruction();
  }

  let total = parseInt(numPublications) + parseInt(numSubscriptions);
  let pubProb = numPublications / total;
  let subProb = 1 - pubProb;
  let pubCounter = 0;
  let subCounter = 0;
  let pubsAndSubs = "";
  while ((subCounter != numSubscriptions) && (pubCounter != numPublications)) {
    if (subCounter == numSubscriptions) {
      pubsAndSubs = pubsAndSubs + fetchRandomPublicationString() + "\n";
      pubCounter++;
    } else if (pubCounter == numPublications) {
      pubsAndSubs = pubsAndSubs + fetchRandomSubscriptionString() + "\n";
      subCounter++;
    } else {
      let sendPublication = probabilisticChoice([subProb, pubProb]);
      if (sendPublication) {
        pubsAndSubs = pubsAndSubs + fetchRandomPublicationString() + "\n";
        pubCounter++;
      } else {
        pubsAndSubs = pubsAndSubs + fetchRandomSubscriptionString() + "\n";
        subCounter++;
      }
    }
  }

  return instructions + "\n" + pubsAndSubs
}

var matchers = {};
var clients = {};
createMatchers(process.argv[2]);
createClients(process.argv[3]);


const instructions = fetchInstructionSet(
  process.argv[4],
  process.argv[5]
);

console.log(instructions);