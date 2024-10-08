const client = require('./lib/client.js');  

try 
{
    const args = process.argv[2];
    const argsJSON = JSON.parse(args);
    const c = new client(GatewayHostname, GatewayClientListenPort, argsJSON.clientAlias, client_x, client_y, client_radius, function(id) {
        c.setAlias = clientAlias;
        let m = c.getMatcherID();
        console.log("Client "+clientAlias+" assigned to matcher with ID: " + m);
        });
}
catch(error)
{

}
