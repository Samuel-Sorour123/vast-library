const fs = require("fs");
const path = require("path");
//Running an experiment on a single host (Matchers are stationary but clients are moving)
//The script generates a text file that the simulator uses to run a simulation

const channels = ["channel1", "channel2", "channel3"];
const payloadLength = [10, 40];
const asciiValueRange = [97, 122];

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

class InstructionManager {
  constructor(args) {

    this.keys = Object.keys(args);
    this.categories = {};
    this.totalInstructionsGenerated = 0;
    this.numInsutructionsToGenerate = 0;

    for (let i = 0; i < this.keys.length; i++) {
      this.categories[this.keys[i]] = {
        numInstructions: args[this.keys[i]],
        instructionCounter: 0,
        instructionProbability: 0,
      };
      this.numInsutructionsToGenerate = this.numInsutructionsToGenerate + args[this.keys[i]];
    }
    this.calculateProbabilities();
  }

  updateCounter(instruction) {
    for (let i = 0; i < this.keys.length; i++) {
      if (instruction == this.keys[i]) {
        this.categories[this.keys[i]].instructionCounter++;
        this.totalInstructionsGenerated++;
        break;
      }
    }
    this.calculateProbabilities()
  }

  calculateProbabilities() {
    let totalInstructionsLeft = this.numInsutructionsToGenerate - this.totalInstructionsGenerated;
    if (totalInstructionsLeft == 0) {
      for (let i = 0; i < this.keys.length; i++) {
        this.categories[this.keys[i]].instructionProbability = 0;
      }
    }
    else {
      for (let i = 0; i < this.keys.length; i++) {
        this.categories[this.keys[i]].instructionProbability = (this.categories[this.keys[i]].numInstructions - this.categories[this.keys[i]].instructionCounter) / totalInstructionsLeft;
      }
    }

  }

  // Method to retrieve the current state of a category
  fetchProbabilities(index) {
    let probabilities = [];
    for (let i = index; i < this.keys.length; i++) {
      probabilities[i - index] = this.categories[this.keys[i]].instructionProbability;
    }
    return probabilities;
  }

  displayInstructionManager() {
    let string = "";
    for (let i = 0; i < this.keys.length; i++) {
      string = string + "The number of type " + this.keys[i] + " instructions to generate is: " + this.categories[this.keys[i]].numInstructions + "\n";
      string = string + "The number of type " + this.keys[i] + " instructions that have been generated is: " + this.categories[this.keys[i]].instructionCounter + "\n";
      string = string + "The probability of choosing instruction " + this.keys[i] + " is: " + this.categories[this.keys[i]].instructionProbability + "\n\n";
    }
  }
}

const processData = (jsonString) => {
  try {
    const data = JSON.parse(jsonString);
    return data;
  } catch (error) {
    console.error("Invalid JSON input:", error);
  }
};

function saveInstructionsToFile(instructions) {
  const directory = './files'; // Directory path
  const filePath = path.join(directory, 'instructions.txt'); // File path

  // Check if the directory exists
  if (!fs.existsSync(directory)) {
    // Create the directory if it doesn't exist
    fs.mkdirSync(directory);
  }

  // Write the instructions to the file in the 'files' directory
  fs.writeFileSync(filePath, instructions, 'utf8');
}

function saveStaticIPs(staticIPs) {
  const directory = './files'; // Directory path
  const filePath = path.join(directory, 'static.json'); // File path

  // Check if the directory exists
  if (!fs.existsSync(directory)) {
    // Create the directory if it doesn't exist
    fs.mkdirSync(directory);
  }

  // Write the static IPs to the file in the 'files' directory
  fs.writeFileSync(filePath, JSON.stringify(staticIPs, null, 3), 'utf8');
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
  if ((sum < 0.999) || (sum > 1.001)) {
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
  let numCharacters = getRandomInt(minCharacter, maxCharacters);
  let payload = "\"";
  for (let i = 0; i < numCharacters; i++) {
    let asciiValue = getRandomInt(asciiValueRange[0], asciiValueRange[1]);
    while ((asciiValue == 34) || (asciiValue == 39) || (asciiValue == 123) || (asciiValue == 125) || (asciiValue == 40) || (asciiValue == 41)) {
      asciiValue = getRandomInt(asciiValueRange[0], asciiValueRange[1]);
    }
    let asciiCharacter = String.fromCharCode(asciiValue);
    payload = payload + asciiCharacter;
  }
  payload = payload + "\"";
  return payload;
}

function generateWaitInsruction(minLength, maxLength) {
  let length = getRandomInt(minLength, maxLength);
  let instruction = "wait " + length.toString();
  return instruction;
}

function createMatchers(numMatchers) {

  let createdSoFar = Object.keys(clients).length;
  for (let m = 1 + createdSoFar; m <= createdSoFar + numMatchers; m++) {
    let r = getRandomInt(0, 100);
    let x = getRandomInt(0, 1000);
    let y = getRandomInt(0, 1000);

    if (m == 1) {
      let staticAddress = matchersAliasToStaticIP["GW"];
      let matcher = new Matcher(
        "GW",
        true,
        staticAddress,
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
      let staticAddress = matchersAliasToStaticIP[matcherID];
      let matcher = new Matcher(
        matcherID,
        false,
        staticAddress,
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
  let createdSoFar = Object.keys(clients).length;


  for (let c = 1 + createdSoFar; c <= createdSoFar + numClients; c++) {
    let r = getRandomInt(0, 100);
    let x = getRandomInt(0, 1000);
    let y = getRandomInt(0, 1000);
    let clientID = "C" + c.toString();
    let staticAddress = clientsAliasToStaticIP[clientID];
    let client = new Client(clientID, staticAddress, "20000", x, y, r);
    clients[clientID] = client;
  }
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

function fetchRandomClientMovement() {
  let clientMovement = "moveClient ";
  let clientKeyArray = Object.keys(clients);
  let clientID = clientKeyArray[getRandomInt(0, clientKeyArray.length - 1)];
  clientMovement = clientMovement + clientID + " " + getRandomInt(0, 1000).toString() + " " + getRandomInt(0, 1000).toString();
  return clientMovement;

}

function fetchInstructionSet() {
  let instructions = "";
  let matcherIDArray = Object.keys(matchers);
  let clientIDArray = Object.keys(clients);

  for (let i = 0; i < matcherIDArray.length; i++) {
    if (i == 0) {
      instructions = matchers[matcherIDArray[i]].fetchInstruction() + "\n" + generateWaitInsruction(2000, 4000);
      instructionInfo.updateCounter("newMatcher");
      instructionInfo.displayInstructionManager();
    }
    else {
      instructions = instructions + "\n" + matchers[matcherIDArray[i]].fetchInstruction() + "\n" + generateWaitInsruction(2000, 4000);
      instructionInfo.updateCounter("newMatcher");
      instructionInfo.displayInstructionManager();
    }
  }

  for (let j = 0; j < clientIDArray.length; j++) {
    instructions = instructions + "\n" + clients[clientIDArray[j]].fetchInstruction() + "\n" + generateWaitInsruction(2000, 4000);
    instructionInfo.updateCounter("newClient");
    instructionInfo.displayInstructionManager();
  }

  while ((instructionInfo.numInsutructionsToGenerate - instructionInfo.totalInstructionsGenerated) != 0) {
    let choice = probabilisticChoice(instructionInfo.fetchProbabilities(2));
    switch (choice) {
      case 0:
        instructions = instructions + "\n" + fetchRandomPublicationString() + "\n" + generateWaitInsruction(2000, 4000);
        instructionInfo.updateCounter("publish");
        instructionInfo.displayInstructionManager();
        break;
      case 1:
        instructions = instructions + "\n" + fetchRandomSubscriptionString() + "\n" + generateWaitInsruction(2000, 4000);
        instructionInfo.updateCounter("subscribe");
        instructionInfo.displayInstructionManager();
        break;
      case 2:
        instructions = instructions + "\n" + fetchRandomClientMovement() + "\n" + generateWaitInsruction(2000, 4000);
        instructionInfo.updateCounter("moveClient");
        instructionInfo.displayInstructionManager();
        break;
    }
  }
  instructions = instructions + "\nend";
  return instructions;
}

function readFile(filePath) {
  try {
    const data = fs.readFileSync(filePath);
    return data.toString();
  } catch (error) {
    console.error("Unable to read the file");
  }
}

function assignAddresses(staticAddressFile, args) {
  let staticAddresses = readFile(staticAddressFile).split("\n");
  let numAddresses = staticAddresses.length;

  if (numAddresses < (args.newMatcher + args.newClient)) {
    console.error("There aren't enough IP addresses");
  } else {
    for (let i = 0; i < args.newMatcher; i++) {
      let randomIndex = getRandomInt(0, staticAddresses.length - 1);
      if (i === 0) {
        matchersAliasToStaticIP["GW"] = staticAddresses[randomIndex];
      } else {
        let id = "M" + (i + 1).toString();
        matchersAliasToStaticIP[id] = staticAddresses[randomIndex];
      }
      staticAddresses.splice(randomIndex, 1);
    }
    for (let j = 0; j < args.newClient; j++) {
      let randomIndex = getRandomInt(0, staticAddresses.length - 1);
      let id = "C" + (j + 1).toString();
      clientsAliasToStaticIP[id] = staticAddresses[randomIndex];
      staticAddresses.splice(randomIndex, 1);
    }
  }

  // Write the data to a file
  let staticIPs = { masterStaticIP: "192.168.101.30", matchersAliasToStaticIP, clientsAliasToStaticIP };
  saveStaticIPs(staticIPs);
}

const jsonInput = process.argv[2];
const staticAddressFile = process.argv[3];
const args = processData(jsonInput);

var matchersAliasToStaticIP = {}
var clientsAliasToStaticIP = {}
assignAddresses(staticAddressFile, args);


var instructionInfo = new InstructionManager(args);
var matchers = {};
var clients = {};
createMatchers(instructionInfo.categories["newMatcher"].numInstructions);
createClients(instructionInfo.categories["newClient"].numInstructions);
var instructions = fetchInstructionSet();


saveInstructionsToFile(instructions);
