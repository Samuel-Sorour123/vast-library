const fs = require("fs");
const { event } = require("jquery");

function readFile(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        return data.toString();
    } catch (error) {
        console.error("Unable to read the file");
    }
}


function fetchReceivedPublications(filePath) {
    let publicationsReceived = [];
    let data = readFile(filePath);
    let dataLines = data.split("\n");
    for (let i = 0; i < dataLines.length - 1; i++) {
        let clientEvent = JSON.parse(dataLines[i]);
        if (clientEvent.event == 10) {
            publicationsReceived.push(clientEvent);
        }
    }
    return publicationsReceived;
}



const filePath = process.argv[2];
var publicationsReceived = fetchReceivedPublications(filePath);
var throughput = [];

let timeperiod = 0;
let index = 0;


//While there are still publications that haven't been counted
while (publicationsReceived[index]) {
    console.log("fdfd");
    console.log(JSON.stringify(publicationsReceived[index]));
    //Current time is the time the publication is received
    let currentTime = publicationsReceived[index].time

    //Count all the publications that happened within 1000ms
    let oneSecondLater = currentTime + 1000;

    while ((currentTime < oneSecondLater)) {
        if (!throughput[timeperiod])
        {
            throughput[timeperiod] = 1;
        }
        else
        {
            throughput[timeperiod]++;
        }
        index++;
        if (publicationsReceived[index]) {
            currentTime = publicationsReceived[index].time;
        } else {
            break; // Exit if there are no more publications
        }
    }
    timeperiod++;
}

for (let i = 0; i < timeperiod; i++)
{
    console.log("The number of messages sent in second " + i + " is " + throughput[i]);
}




