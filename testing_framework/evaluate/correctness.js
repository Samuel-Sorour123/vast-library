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
}

class Publication {
  constructor(pubID, payload, mustReceive, receivePublication) {
    this.pubID = pubID;
    this.payload = payload;
    this.mustReceive = 0;
    this.receivePublication = 0;
  }

  incrementMustReceive() {
    this.mustReceive = this.mustReceive + 1;
  }

  incrementReceivePublication()
  {
    this.receivePublication = this.receivePublication + 1;
  }

  toString()
  {
    return `Publication ID: ${this.pubID}\n\tPayload: ${this.payload}\n\tMust Receive: ${this.mustReceive}\n\tReceive: ${this.receivePublication}\n`;
  }
}

class MessageTracker {
  constructor(clientID) {
    this.clientID = clientID;
    this.receivePublication = 0;
    this.mustReceive = 0;
    this.publications = {};
  }
  incrementMustReceive() {
    this.mustReceive = this.mustReceive + 1;
  }
  incrementReceivePublication() {
    this.receivePublication = this.receivePublication + 1;
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
    this.mustReceive = this.mustReceive + 1;
  }
  toString() {
    let string = `Client: ${this.clientID}\nMust Receive: ${this.mustReceive}\nReceived: ${this.receivePublication}\n\tALL PUBLICATIONS\n`;
    let keyArray = Object.keys(this.publications) 
    for (let i = 0; i < keyArray.length; i++)
    {
      string = string + `\t` + this.publications[keyArray[i]] + `\n`;
    }
    return string;
  }
}

// CLIENT_JOIN:          0,
//   CLIENT_LEAVE :        1,
//   CLIENT_CONNECT:       2,
//   CLIENT_DISCONNECT:    3,
//   CLIENT_MIGRATE:       4,
//   CLIENT_MOVE :         5,
//   SUB_NEW :             6,
//   SUB_UPDATE :          7,
//   SUB_DELETE :          8,
//   PUB :                 9,
//   RECEIVE_PUB:          10,

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
        clientMessageTrackers[clientID].addActualPublication(clientEvents[i].pub);
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
    if (pubChannel == subscription.channel) {
      if (subscription.doesIntersect(pubArea)) {
        if (!clientMessageTrackers[subscription.clientID]) {
          let messageTracker = new MessageTracker(subscription.clientID);
          messageTracker.addExpectedPublication(pub);
          clientMessageTrackers[subscription.clientID] = messageTracker;
        } else {
          clientMessageTrackers[subscription.clientID].addExpectedPublication(pub);
        }
      }
    }
  }
}

function determineCorrectness() {
  //Type 1: Not receiving enough publications
  //Type 2: Receiving duplicate publications.
  //Type 3: Receiving unwanted publications, i.e. receiving publications to which we are not subscribed
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
  } else if (clientEvents[i].event == 9) {
    updateClientMessageTrackers(clientEvents[i].pub);
  }
}
let keys = Object.keys(clientMessageTrackers);
for (let j = 0; j < keys.length; j++)
{
  console.log(clientMessageTrackers[keys[j]].toString());
}
