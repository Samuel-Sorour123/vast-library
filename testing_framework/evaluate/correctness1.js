const fs = require("fs");
const { event } = require("jquery");

class Subscription {
  constructor(clientID, subID, channel, aoi) {
    this.clientID = clientID;
    this.subID = subID;
    this.channel = channel;
    this.aoi = aoi;
  }
  doesIntersect(pubArea) {
    let distance = Math.sqrt(
      (pubArea.center.x - this.aoi.center.x) ** 2 +
        (pubArea.center.y - this.aoi.center.y) ** 2
    );
    let radiusSum = pubArea.radius + this.aoi.radius;
    if (distance <= radiusSum) {
      return 1;
    } else {
      return 0;
    }
  }

  toString(){
    return `Client: ${this.clientID}\nSubID: ${this.subID}\nChannel: ${this.channel}\nAOI: x = ${this.aoi.center.x}\t y = ${this.aoi.center.y}\t r = ${this.aoi.radius}\n`;
  }
}

class Publication {
  constructor(pubID, payload, mustReceive, receivePublication) {
    this.pubID = pubID;
    this.payload = payload;
    this.mustReceive = 0;
    this.receivePublication = 0;
    this.unwantedPublication = true;
  }

  incrementMustReceive() {
    this.mustReceive = this.mustReceive + 1;
  }
  incrementReceivePublication() {
    this.receivePublication = this.receivePublication + 1;
  }

  errorCount(type) {
    let errorCount = 0;
    if (type != 3) {
      if (type == 1) {
        errorCount = errorCount + this.mustReceive - this.receivePublication;
      } else if (type == 2) {
        errorCount = errorCount + this.receivePublication - this.mustReceive;
      }
      if (this.unwantedPublication == false) {
        if (errorCount > 0) {
          return errorCount;
        }
      }
      return 0;
    } else {
      if (this.unwantedPublication == true) {
        errorCount = errorCount + this.receivePublication;
        console.log("The receive publication: " + this.receivePublication);
        return errorCount;
      }
      return 0;
    }
  }

  setWantedPublication() {
    this.unwantedPublication = false;
  }

  toString() {
    return `Publication ID: ${this.pubID}\n\tPayload: ${this.payload}\n\tMust Receive: ${this.mustReceive}\n\tReceive: ${this.receivePublication}\n\tUnwanted Publication: ${this.unwantedPublication}\n`;
  }
}

class MessageTracker {
  constructor(clientID) {
    this.clientID = clientID;
    this.receivePublication = 0;
    this.mustReceive = 0;
    this.publications = {};
  }

  addActualPublication(pub) {
    if (!this.publications[pub.pubID]) {
      let publication = new Publication(pub.pubID, pub.payload);
      this.publications[pub.pubID] = publication;
    }
    this.publications[pub.pubID].incrementReceivePublication();
    this.receivePublication = this.receivePublication + 1;
  }
  addExpectedPublication(pub) {
    if (!this.publications[pub.pubID]) {
      let publication = new Publication(pub.pubID, pub.payload);
      this.publications[pub.pubID] = publication;
    }
    this.publications[pub.pubID].incrementMustReceive();
    this.publications[pub.pubID].setWantedPublication();
    this.mustReceive = this.mustReceive + 1;
  }

  errorCount(type) {
    let errorCount = 0;
    let keys = Object.keys(this.publications);
    for (let i = 0; i < keys.length; i++) {
      let publication = this.publications[keys[i]];
      if (type == 1) {
        errorCount = errorCount + publication.errorCount(1);
      } else if (type == 2) {
        errorCount = errorCount + publication.errorCount(2);
      } else if (type == 3) {
        errorCount = errorCount + publication.errorCount(3);
      }
    }
    return errorCount;
  }

  toString() {
    let string = `Client: ${this.clientID}\nMust Receive: ${this.mustReceive}\nReceived: ${this.receivePublication}\n\tALL PUBLICATIONS\n`;
    let keyArray = Object.keys(this.publications);
    for (let i = 0; i < keyArray.length; i++) {
      string = string + `\t` + this.publications[keyArray[i]] + `\n`;
    }
    return string;
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

function getRelevantClientEvents(filePath) {
  let data = readFile(filePath);
  let dataLines = data.split("\n");
  let clientEvents = [];

  for (let i = 0; i < dataLines.length - 1; i++) {
    let clientEvent = JSON.parse(dataLines[i]);
    if (
      clientEvent.event == 6 ||
      clientEvent.event == 7 ||
      clientEvent.event == 8 ||
      clientEvent.event == 9 ||
      clientEvent.event == 10
    ) {
      clientEvents.push(clientEvent);
    }
  }
  return clientEvents;
}

function intialiseClientMessageTrackers(clientEvents) {
  let clientMessageTrackers = {};
  for (let i = 0; i < clientEvents.length; i++) {
    if (clientEvents[i].event == 10) {
      let clientID = clientEvents[i].id;
      if (!clientMessageTrackers[clientID]) {
        let messageTracker = new MessageTracker(clientID);
        messageTracker.addActualPublication(clientEvents[i].pub);
        clientMessageTrackers[clientID] = messageTracker;
      } else {
        clientMessageTrackers[clientID].addActualPublication(
          clientEvents[i].pub
        );
      }
    }
  }
  return clientMessageTrackers;
}

function updateClientMessageTrackers(pub) {
  let pubArea = pub.aoi;
  let pubChannel = pub.channel;
  for (let i = 0; i < activeSubscriptions.length; i++) {
    let subscription = activeSubscriptions[i];
    console.log(subscription.toString());
    if (pubChannel == subscription.channel) {
      if (subscription.doesIntersect(pubArea)) {
        if (!clientMessageTrackers[subscription.clientID]) {
          let messageTracker = new MessageTracker(subscription.clientID);
          messageTracker.addExpectedPublication(pub);
          clientMessageTrackers[subscription.clientID] = messageTracker;
        } else {
          clientMessageTrackers[subscription.clientID].addExpectedPublication(
            pub
          );
        }
      }
    }
  }
}

function countErrors() {
  //Type 1: Not receiving enough publications
  //Type 2: Receiving duplicate publications.
  //Type 3: Receiving unwanted publications, i.e. receiving publications to which we are not subscribed

  let messageTrackerKeys = Object.keys(clientMessageTrackers);
  let type1 = 0;
  let type2 = 0;
  let type3 = 0;
  let totalReceived = 0;
  let totalExpected = 0;

  for (let i = 0; i < messageTrackerKeys.length; i++) {
    let messageTracker = clientMessageTrackers[messageTrackerKeys[i]];
    type1 = type1 + messageTracker.errorCount(1);
    type2 = type2 + messageTracker.errorCount(2);
    type3 = type3 + messageTracker.errorCount(3);
    totalReceived = totalReceived + messageTracker.receivePublication;
    totalExpected = totalExpected + messageTracker.mustReceive;
  }
  return [type1, type2, type3, totalExpected, totalReceived];
}

const filePath = "./../../visualiser/logs_and_events/Client_events.txt";
var clientEvents = getRelevantClientEvents(filePath);
var clientMessageTrackers = intialiseClientMessageTrackers(clientEvents);
var activeSubscriptions = [];

for (let i = 0; i < clientEvents.length; i++) {
  if (clientEvents[i].event == 6) {
    let clientID = clientEvents[i].id;
    let subID = clientEvents[i].sub.subID;
    let channel = clientEvents[i].sub.channel;
    let aoi = clientEvents[i].sub.aoi;
    let subscription = new Subscription(clientID, subID, channel, aoi);
    activeSubscriptions.push(subscription);
  } else if (clientEvents[i].event == 7) {
  } else if (clientEvents[i].event == 8) {
  } else if (clientEvents[i].event == 9) {
    updateClientMessageTrackers(clientEvents[i].pub);
  }
}


let keys = Object.keys(clientMessageTrackers);

for (let i = 0; i < keys.length; i++)
{
  console.log(clientMessageTrackers[keys[i]].toString());
}

const info = countErrors();

console.log("The total number of type 1 errors: " + info[0] + "\n");
console.log("The total number of type 2 errors: " + info[1] + "\n");
console.log("The total number of type 3 errors: " + info[2] + "\n");
console.log(
  "The total number of publications that should have been received: " +
    info[3] +
    "\n"
);
console.log(
  "The total number of publications that were actually received: " +
    info[4] +
    "\n"
);
