const fs = require("fs");

function readFile(filePath)
{
    try {
        const data = fs.readFileSync(filePath);
        return data.toString();
    } catch (error){
        console.error("Unable to read the file");
    }
}


const filePath = "./../logs_and_events/Matcher_events.txt";
const events = readFile(filePath);
console.log(events);