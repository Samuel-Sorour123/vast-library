const matcher = require("../../../lib/matcher.js");


try{
    const args = process.argv[2];
    const argsJSON = JSON.parse(args);
    const matcherAlias = argsJSON.options.alias;
    const gw = new matcher(argsJSON.x_ord, argsJSON.y_ord, argsJSON.radius, argsJSON.options, function(id) {  
            console.log("Matcher with alias " + matcherAlias + " was created and was assigned an id of " + argsJSON.options.GW_Host); 
            process.exit(0); 
        }  
    );  
} catch(err)
{
    console.log(err)
    console.error("The matcher couldn't be created");
    process.exit(1);
}



