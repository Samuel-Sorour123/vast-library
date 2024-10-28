const { exec, spawn } = require("child_process");

let command = ['ssh', 'Samuel Sorour@192.168.0.30', 'wsl', 'cd ~/', ' mkdir Sam'];

const child = spawn(command[0], command.splice(1));

child.on('error', (error) =>{
    console.log(error);
});


// exec('ssh "Samuel Sorour@192.168.0.30"', (err, stdout, stderr) =>{
//  if(err)
//  {
//     console.log("Oh no: " + err);
//  }
//  if (stderr)
//  {
//     console.log("Oh fuck: " + stderr);
//  }
//  if (stdout)
//  {
//     console.log("Standard output: " + stdout);
//  }
// });