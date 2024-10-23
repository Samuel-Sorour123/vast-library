const { publicEncrypt } = require("crypto");
const fs = require("fs");
const { event } = require("jquery");

class Latency {
  constructor(pubSender, pubReceiver, timeElapsed, pub) {
    this.pubSender = pubSender;
    this.pubReceiver = pubReceiver;
    this.timeElapsed = timeElapsed;
    this.publication = pub;
  }

  toString() {
    return "Client ID that made the publication: " + this.pubSender + "\nClient ID that received the publication: " + this.pubReceiver + "\nTime that was elapsed: " + this.timeElapsed + "\nThe publication was: " + this.publication + "\n";
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
  
      if (clientEvent.event == 9) {
        allPublications[clientEvent.pub.pubID] = clientEvent;
      } else if (clientEvent.event == 10) {
        // Ensure it is an array or initialize as an array
        if (!Array.isArray(allPublicationsReceived[clientEvent.pub.pubID])) {
          allPublicationsReceived[clientEvent.pub.pubID] = [];
        }
  
        // Add the event to the array
        allPublicationsReceived[clientEvent.pub.pubID].push(clientEvent);
      }
    }
  }

var allPublications = {};
var allPublicationsReceived = {};
var latencyInformation = [];

loadData("./../../visualiser/logs_and_events/Client_events.txt");

let pubKeys = Object.keys(allPublications);
let pubReceiveKeys = Object.keys(allPublicationsReceived);
for (let i = 0; i < pubKeys.length; i++) {
  
  while (allPublicationsReceived[pubReceiveKeys[i]].length != 0) {
    let pubSent = allPublications[pubKeys[i]];
    let pubReceived = allPublicationsReceived[pubReceiveKeys[i]].pop();
    let timeElapsed = pubReceived.time - pubSent.time;
    let latency = new Latency(pubSent.id, pubReceived.id, timeElapsed, pubSent.pub);
    latencyInformation.push(latency);
  }
}

for (let j = 0; j < latencyInformation.length; j++)
{
    console.log(latencyInformation[j].toString());
}
