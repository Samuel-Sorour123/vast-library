// imports
const client = require('../lib/client.js');  

// Gateway information
GatewayHostname = "192.168.101.243"
GatewayClientListenPort = 20000
clientAlias = "C1"  

// Client information
client_x = 350
client_y = 350
client_radius = 20  

c = new client(GatewayHostname, GatewayClientListenPort, clientAlias, client_x, client_y, client_radius, function(id) {
    c.setAlias = clientAlias;
    let m = c.getMatcherID();
    console.log("Client "+clientAlias+" assigned to matcher with ID: " + m);
    });