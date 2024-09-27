const fs = require("fs");
const { event } = require("jquery");

class Subscription {
  constructor(time, subID, clientID, channel, aoi) {
    this.time = time;
    this.subID = subID;
    this.clientID = clientID;
    this.channel = channel;
    this.aoi = aoi;
  }
  toString() {
    return `SubID: ${this.subID}\nTime: ${this.time}\nClientID: ${this.clientID}\nChannel: ${this.channel}\nAOI: x = ${this.aoi.center.x}\ty = ${this.aoi.center.y}\tr = ${this.aoi.radius}\n`;
  }
}

class Publication {
  constructor(time, pubID, channel, aoi, payload, isReceivedPublication) {
    (this.time = time), (this.pubID = pubID);
    this.channel = channel;
    this.aoi = aoi;
    this.payload = payload;
    this.isReceivedPublication = isReceivedPublication;
    this.clients = {};
  }
  toString() {
    let string = `PubID: ${this.pubID}\nTime: ${this.time}\nChannel ${this.channel}\nAOI: x = ${this.aoi.center.x}\ty = ${this.aoi.center.y}\tr = ${this.aoi.radius}\nPayload: ${this.payload}\nReceived: ${this.isReceivedPublication}\n\tALL CLIENTS\n`;
    let keys = Object.keys(this.clients);
    let message = "";
    if (this.isReceivedPublication) {
      message = "Publications received: ";
    } else {
      message = "Publications that were supposed to be received: ";
    }
    for (let i = 0; i < keys.length; i++) {
      string =
        string +
        "\tClientID: " +
        keys[i] +
        "\t" +
        message +
        this.clients[keys[i]] +
        "\n";
    }
    return string;
  }
}

class Client {
  constructor(clientID) {
    this.clientID = clientID;
    this.mustReceiveTotal = 0;
    this.receivedTotal = 0;
    this.expectedPublications = {};
    this.actualPublications = {};
  }
  toString() {
    let string = `####################\nClient: ${this.clientID}\nMust Receive Total: ${this.mustReceiveTotal}\nReceived Total: ${this.receivePublicationTotal}\n\tALL EXPECTED PUBLICATIONS\n`;
    let keyArray = Object.keys(this.expectedPublications);
    for (let i = 0; i < keyArray.length; i++) {
      string = string + this.publications[keyArray[i]];
    }
    string = string + "\tALL PUBLICATIONS ACTUALLY RECEIVED\n";
    keyArray = Object.keys(this.actualPublications);
    for (let i = 0; i < keyArray.length; i++) {
      string = string + this.actualPublications[keyArray[i]];
    }
    string = string + "####################\n\n";
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

function loadData(filePath) {
  let data = readFile(filePath);
  let dataLines = data.split("\n");

  for (let i = 0; i < dataLines.length - 1; i++) {
    let clientEvent = JSON.parse(dataLines[i]);
    if (
      clientEvent.event == 6 ||
      clientEvent.event == 7 ||
      clientEvent.event == 8
    ) {
      if (clientEvent.event == 6) {
        let subscription = new Subscription(
          clientEvent.time,
          clientEvent.sub.subID,
          clientEvent.sub.clientID,
          clientEvent.sub.channel,
          clientEvent.sub.aoi
        );
        allSubscriptions[clientEvent.sub.subID] = subscription;
      }
      allSubscriptionEvents.push(clientEvent);
    } else if (clientEvent.event == 9) {
      let publication = new Publication(
        clientEvent.time,
        clientEvent.pub.pubID,
        clientEvent.pub.channel,
        clientEvent.pub.aoi,
        clientEvent.pub.payload,
        0
      );
      allPublications[clientEvent.pub.pubID] = publication;
    } else if (clientEvent.event == 10) {
      totalMessagesReceived++;
      if (!allPublicationsReceived[clientEvent.pub.pubID]) {
        allPublicationsReceived[clientEvent.pub.pubID] = new Publication(
          clientEvent.time,
          clientEvent.pub.pubID,
          clientEvent.pub.channel,
          clientEvent.pub.aoi,
          clientEvent.pub.payload,
          1
        );

        allPublicationsReceived[clientEvent.pub.pubID].clients[
          clientEvent.id
        ] = 1;
      } else {
        if (
          !allPublicationsReceived[clientEvent.pub.pubID].clients[
            clientEvent.id
          ]
        ) {
          allPublicationsReceived[clientEvent.pub.pubID].clients[
            clientEvent.id
          ] = 1;
        } else {
          allPublicationsReceived[clientEvent.pub.pubID].clients[
            clientEvent.id
          ]++;
        }
      }
    }
  }
}

function overlap(subscription, publication) {
  let distance = Math.sqrt(
    (publication.aoi.center.x - subscription.aoi.center.x) ** 2 +
      (publication.aoi.center.y - subscription.aoi.center.y) ** 2
  );
  let radiusSum = publication.aoi.radius + subscription.aoi.radius;
  if (distance <= radiusSum) {
    return 1;
  } else {
    return 0;
  }
}

function obtainActiveSubscriptions(pubTime) {
  let activeSubscriptions = {};
  let subscriptionKeys = Object.keys(allSubscriptions);
  for (let i = 0; i < subscriptionKeys.length; i++) {
    if (allSubscriptions[subscriptionKeys[i]].time < pubTime) {
      activeSubscriptions[subscriptionKeys[i]] =
        allSubscriptions[subscriptionKeys[i]];
    }
  }
  return activeSubscriptions;
}

function processPublicationEvent(publication) {
  let activeSubscriptions = obtainActiveSubscriptions(publication.time);
  let keys = Object.keys(activeSubscriptions);
  let clients = {};
  for (let i = 0; i < keys.length; i++) {
    let subscription = activeSubscriptions[keys[i]];
    if (subscription.channel == publication.channel) {
      if (overlap(subscription, publication)) {
        totalMessagesSent++;
        if (!clients[subscription.clientID]) {
          clients[subscription.clientID] = 1;
        } else {
          clients[subscription.clientID]++;
        }
      }
    }
  }
  allPublications[publication.pubID].clients = clients;
}

function errorType3() {
  let errorCount = 0;
  let keysPubs = Object.keys(allPublicationsReceived);
  for (let i = 0; i < keysPubs.length; i++) {
    let receivedPublication = allPublicationsReceived[keysPubs[i]];
    let keysClients = Object.keys(receivedPublication.clients);
    if (!allPublications[keysPubs[i]]) {
      for (let j = 0; j < keysClients.length; j++) {
        errorCount = errorCount + receivedPublication.clients[keysClients[j]];
      }
    } else {
      for (let j = 0; j < keysClients.length; j++) {
        if (!allPublications[keysPubs[i]].clients[keysClients[j]]) {
          errorCount = errorCount + receivedPublication.clients[keysClients[j]];
        }
      }
    }
  }
  return errorCount;
}

function errorType2() {
  let errorCount = 0;
  let keysPubs = Object.keys(allPublicationsReceived);
  for (let i = 0; i < keysPubs.length; i++) {
    let receivedPublication = allPublicationsReceived[keysPubs[i]];
    let keysClients = Object.keys(receivedPublication.clients);
    if (allPublications[keysPubs[i]]) {
      for (let j = 0; j < keysClients.length; j++) {
        if (allPublications[keysPubs[i]].clients[keysClients[j]]) {
          let duplicates = Math.max((receivedPublication.clients[keysClients[j]] - allPublications[keysPubs[i]].clients[keysClients[j]]), 0);
          errorCount = errorCount + duplicates;
        }
      }
    }
  }
  return errorCount;
}

function errorType1() {
  let errorCount = 0;
  let keysPubs = Object.keys(allPublications);
  for (let i = 0; i < keysPubs.length; i++) {
    let expectedPublication = allPublications[keysPubs[i]];
    let keysClients = Object.keys(expectedPublication.clients);
    if (!allPublicationsReceived[keysPubs[i]]) {
      for (let j = 0; j < keysClients.length; j++) {
        errorCount = errorCount + expectedPublication.clients[keysClients[j]];
      }
    } else {
      console.log(expectedPublication.toString());
      console.log(allPublicationsReceived[keysPubs[i]].toString());
      for (let j = 0; j < keysClients.length; j++) {
        if (!allPublicationsReceived[keysPubs[i]].clients[keysClients[j]]) {
          errorCount = errorCount + expectedPublication.clients[keysClients[j]];
        }
        else
        {
          let missing = Math.max((expectedPublication.clients[keysClients[j]] - allPublicationsReceived[keysPubs[i]].clients[keysClients[j]]), 0);
          errorCount = errorCount + missing;
        }
      }
    }
  }
  return errorCount;
}

var allSubscriptions = {};
var allSubscriptionEvents = [];
var allPublications = {};
var allPublicationsReceived = {};
var totalMessagesSent = 0;
var totalMessagesReceived = 0;

const filePath = "./../../visualiser/logs_and_events/Client_events.txt";
loadData(filePath);

let keys = Object.keys(allPublications);

for (let i = 0; i < keys.length; i++) {
  let publication = allPublications[keys[i]];
  processPublicationEvent(publication);
}

let error1 = errorType1();
let error2 = errorType2();
let error3 = errorType3();

console.log("The total number of type 1 errors: " + error1 + "\n");
console.log("The total number of type 2 errors: " + error2 + "\n");
console.log("The total number of type 3 errors: " + error3 + "\n");
console.log(
  "The total number of publications that should have been received: " +
    totalMessagesReceived +
    "\n"
);
console.log(
  "The total number of publications that were actually received: " +
    totalMessagesSent +
    "\n"
);
