const fs = require("fs");
const { event } = require("jquery");

var allPublications = {};
var allPublicationsReceived = {};
var totalMessagesReceived = 0;

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
            totalMessagesReceived++;
            // Ensure it is an array or initialize as an array
            if (!Array.isArray(allPublicationsReceived[clientEvent.pub.pubID])) {
                allPublicationsReceived[clientEvent.pub.pubID] = [];
            }

            // Add the event to the array
            allPublicationsReceived[clientEvent.pub.pubID].push(clientEvent);
        }
    }
}

loadData("./../../visualiser/logs_and_events/Client_events.txt");

let keys1 = Object.keys(allPublications);
let keys2 = Object.keys(allPublicationsReceived);

let timeFirstPublicationMade = allPublications[keys1[0]].time;
console.log(timeFirstPublicationMade);
let lastPublication = allPublicationsReceived[keys2[keys2.length-1]].pop();
let timeLastPublicationReceived = lastPublication.time;
console.log(timeLastPublicationReceived);
let timeInterval = timeLastPublicationReceived - timeFirstPublicationMade;
console.log(timeInterval);
let throughput = totalMessagesReceived/timeInterval;


console.log("The throughput is: " + throughput);




