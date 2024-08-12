const fs = require('fs');


var data = "";
var client = 1;

for (let x = 100; x <= 900; x = x + 100)
{
    for (let y = 100; y <= 900; y = y + 100)
    {
        client_string = client.toString();
        data = data + "\nnewClient C" + client.toString() + " localhost 20000 " + x.toString() + " " + y.toString() + " 100" + "\nwait 100";
        client++
    }
}

console.log(data)


//Write data to client_instructions.txt
fs.writeFile('client_instructions.txt', data, function callback(err) {
    if (err) {
        // An error occurred during the file write operation
        console.error('Error writing to file', err);
    } else {
        // File was written successfully
        console.log('File written successfully');
    }
});
