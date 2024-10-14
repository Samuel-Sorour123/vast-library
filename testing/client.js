// imports
const client = require('../lib/client.js');  

// Gateway information
let GatewayHostname = "192.168.0.12";
let GatewayClientListenPort = 20000;
let clientAlias = "C1";

// Client information
let client_x = 350
let client_y = 350
let client_radius = 20  

c = new client(GatewayHostname, GatewayClientListenPort, clientAlias, client_x, client_y, client_radius, function(id) {
    c.setAlias = clientAlias;
    let m = c.getMatcherID();
    console.log("Client "+clientAlias+" assigned to matcher with ID: " + m);
    });