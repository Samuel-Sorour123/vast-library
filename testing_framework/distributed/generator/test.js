// imports
const matcher = require('../../../lib/matcher.js');
const client = require('../../../lib/client.js');
const mqtt = require('mqtt');

var log = LOG.newLayer('Simulator_logs', 'Simulator_logs', 'logs_and_events', 5, 5);
var mqttLog = LOG.newLayer('MQTT_logs', 'MQTT_logs', 'logs_and_events', 5, 5);
var fs = require('fs');
const readline = require('readline');
const { map, data } = require('jquery');
const { exec } = require('child_process');


exec("node printHello.js", (err, stderr, stdout) =>{
    if (err)
    {
        console.log(err);
        return;
    }
    if (stderr)
    {
        console.log(stderr);
        return;
    }
    if (stdout)
    {
        console.log(stdout);
    }

});