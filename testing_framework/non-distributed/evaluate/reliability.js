const fs = require("fs");
const { event } = require("jquery");


//allSubscriptions is a JSON object that is indexed by subscription ids.
//It stores the supscription details of every subscription that has been made
var allSubscriptions = {};

//allSubscriptionEvents is an array that stores any subscription event namely creating a subscription, updating a subscription and deleting a subscription. 
var allSubscriptionEvents = [];

//allPublications is a JSON object that is indexed by publication ids that have been made by clients.
//It stores every publication that should have been received by any client.
//It also stores a JSON objected called clients. This JSON object is indexed by client ids.
//The JSON object clients stores the number of times a particular client should have received a particular publication.
var allPublications = {};

//allPublicationsReceived is a JSON object that is indexed by publication ids that have been received by clients.
//It stores every publication that has been received by any client.
//It also stores a JSON object called clients. This JSON object is indexed by client ids.
//The JSON object clients stores the number of times a particular client has received this particular publication.
var allPublicationsReceived = {};
 
//totalMessagesSent denotes ideal number of publications to be delivered
var totalMessagesSent = 0;

//totalMessagesReceived denotes the number of publications that were actually received by clients
var totalMessagesReceived = 0;

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
    this.time = time;
    this.pubID = pubID;
    this.channel = channel;
    this.aoi = aoi;
    this.payload = payload;
    //There are two JSON objects that stores publication objects namely allPublications and allReceivedPublications.
    //To specify which JSON object the publication object belongs to we have the varible isReceivedPublication.
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
        console.log(receivedPublication[keysPubs[i]].toString());
        errorCount = errorCount + receivedPublication.clients[keysClients[j]];
      }
    } else {
      for (let j = 0; j < keysClients.length; j++) {
        if (!allPublications[keysPubs[i]].clients[keysClients[j]]) {
          console.log(receivedPublication.toString());
          console.log(allPublications[keysPubs[i]].toString());
          console.log(allPublications[keysPubs[i]]);
          let time = allPublications[keysPubs[i]].time;
          let activeSub = obtainActiveSubscriptions(time);
          let keys = Object.keys(activeSub);
          for (let i = 0; i < keys.length; i++)
          {
            console.log(activeSub[keys[i]].toString());
          }

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

function determineCorrectness(error1, error2, error3)
{
//Pe denotes the total number of erroneous publications received
const Pe = error1 + error2 + error3;
//Pi denotes the ideal number of publications to be delivered
const Pi = totalMessagesSent;
const correctness = Pi/(Pi+Pe);
return correctness;
}

function determineConsistency(error1)
{
  //Pi denotes the ideal number of publications to be delivered
  const Pi = totalMessagesSent;
  //Pa denotes the total number of correct publications that were received
  const Pa = Pi - error1;
  const consistency = Pa/Pi;
  return consistency;
}

const filePath = "test.txt";
//The allSubscriptions, allPublications and allPublicationsReceived JSON objects are assigned values at specific indexes.
loadData(filePath);

let keys = Object.keys(allPublications);

//All the publication events are processed and it is determined for each publication how many times each client should have received and did actually receive the publication.
for (let i = 0; i < keys.length; i++) {
  let publication = allPublications[keys[i]];
  processPublicationEvent(publication);
}

//Determine the number of type 1 errors.
//This is the number of times a publication was supposed to be received and it wasn't
let error1 = errorType1();

//Determine the number of type 2 errors.
//This is the number of times a client received too many publications. We count the number of extras that were received.
let error2 = errorType2();

//Determine the number of type 3 errors.
//This is the number of unwanted publications that were received. It is unwanted if a client receives publication to which it is not subscribed. 
let error3 = errorType3();

let correctnesss = determineCorrectness(error1, error2, error3);
let consistency = determineConsistency(error1);


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
console.log("The correctness was: " + correctnesss);
console.log("The consistency was: " + consistency);
