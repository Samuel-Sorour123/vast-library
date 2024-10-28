const { exec, spawn } = require("child_process");
const path = require('path');
// let command = ['ssh', ''];

// const child = spawn(command[0], command.splice(1));

// child.stderr.on('data', (data)=>{
// console.log("stderr: " + data);
// });

// child.stdout.on('data', (data)=>
// {
//     console.log("stdout: " + data);
// });

// child.on('error', (error) =>{
//     console.log(error);
// });

// child.on('close', (code) =>{
//  if (code === 0)
//  {
//     console.log("Command was successful and exited with code " + code);
//  }
//  else{
//     console.log("Command was unsuccessful and exited with code " + code);
//  }
// }
// );

let sourcePath = path.resolve(__dirname, "retard");
exec(`scp -r retard 'Samuel Sorour@192.168.0.20:\\Users\\Samuel Sorour'
`, (err, stdout, stderr) => {
    if (err) {
        console.log("err: " + err);
        return;
    }
    if (stderr) {
        console.log("sterr: " + stderr);
    }
    if (stdout) {
        console.log("stdout: " + stdout);
    }
    return 0;
});

exec("ssh 'Samuel Sorour@192.168.0.20' 'wsl bash -c \"cd /mnt/c/Users/Samuel\\ Sorour  && cp -r retard ~/vast-library/testing_framework/distributed/generator\"'", (err, stdout, stderr) => {
    if (err) {
        console.log("err: " + err);
        return;
    }
    if (stderr) {
        console.log("sterr: " + stderr);
    }
    if (stdout) {
        console.log("stdout: " + stdout);
    }
});
