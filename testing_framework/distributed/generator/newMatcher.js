const matcher = require("../../../lib/matcher.js");

try{
    const args = process.argv[2];
    const argsJSON = JSON.parse(args);
    const matcherAlias = argsJSON.options.alias;
    const gw = new matcher(argsJSON.x_ord, argsJSON.y_ord, argsJSON.radius, argsJSON.options, function(id) {  
            console.log("Gateway "+matcherAlias+" has successfully joined Voronoi Overlay Network and been assigned id "+id);  
        }  
    );  
} catch(err)
{
    console.error("An error occurred: " + err.message);
    process.exit(1);
}



