// imports  
const matcher = require('./lib/matcher.js');  

// Gateway information  
const GatewayHostname = '192.168.0.20';  
const GatewayPort = 8000;  
const MatcherVONPort = 8001; 
const ClientListenPort = 21000;  
const matcherAlias = "GW";  
const matcher_x = 500; 
const matcher_y = 500; 
const matcher_radius = 100;    

const options = {  
        isGateway: true,  
        GW_host: GatewayHostname,  
        GW_port: GatewayPort,  
        VON_port: MatcherVONPort,  
        client_port: ClientListenPort,  
        alias: matcherAlias,  
}  

const gw = new matcher(matcher_x, matcher_y, matcher_radius, options, function(id) {  
    console.log("Gateway "+matcherAlias+" has successfully joined Voronoi Overlay Network and been assigned id "+id)  
}  
);  

