const express = require("express");
const app = express();
const { execFile } = require("child_process");
const path = require("path");

const experimentParamsHTML = `
     <!DOCTYPE html>
    <html>
    <head>
      <title>Experiment Parameters</title>
      <link rel="stylesheet" type="text/css" href="styles.css">
    </head>
    <body>
      <h1>Experiment Parameters</h1>
      <form action="/run" method="post">
        <label>newMatcher:<br /><input type="number" name="newMatcher" required /></label>
        <label>newClient:<br /><input type="number" name="newClient" required /></label>
        <label>publish:<br /><input type="number" name="publish" required /></label>
        <label>subscribe:<br /><input type="number" name="subscribe" required /></label>
        <label>moveClient:<br /><input type="number" name="moveClient" required /></label>
        <button type="submit">Run Experiment</button>
      </form>
    </body>
    </html>
  `;
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.send(experimentParamsHTML);
});

app.post("/run", (req, res) => {
  const experimentParams = {
    newMatcher: parseInt(req.body.newMatcher, 10),
    newClient: parseInt(req.body.newClient, 10),
    publish: parseInt(req.body.publish, 10),
    subscribe: parseInt(req.body.subscribe, 10),
    moveClient: parseInt(req.body.moveClient, 10),
  };

  const experimentParamsJson = JSON.stringify(experimentParams);
  const experimentScriptPath = path.join(
    __dirname,
    "../generator/experiment2.js"
  );
  const command = `node ${experimentScriptPath} ${experimentParamsJson}`;

  console.log(`Running command: ${command}`);

  execFile(
    "node",
    [experimentScriptPath, experimentParamsJson],
    (error, stdout) => {
      if (error) {
        console.error(`Error: ${error.message}`);
        res.send(`<!DOCTYPE html>
    <html>
    <head>
      <title>Experiment Parameters</title>
      <link rel="stylesheet" type="text/css" href="styles.css">
    </head>
    <body>
      <h1>Experiment Parameters</h1>
      <form action="/run" method="post">
        <label>newMatcher:<br /><input type="number" name="newMatcher" required /></label>
        <label>newClient:<br /><input type="number" name="newClient" required /></label>
        <label>publish:<br /><input type="number" name="publish" required /></label>
        <label>subscribe:<br /><input type="number" name="subscribe" required /></label>
        <label>moveClient:<br /><input type="number" name="moveClient" required /></label>
        <button type="submit">Run Experiment</button>
      </form>
      <h1> Experiment Status </h1>
      <pre>Error: ${error.message}</pre>
    </body>
    </html>`);
        return;
      }
      console.log(`stdout:\n${stdout}`);
      const combinedHTML = `<!DOCTYPE html>
    <html>
    <head>
      <title>Experiment Parameters</title>
      <link rel="stylesheet" type="text/css" href="styles.css">
    </head>
    <body>
      <h1>Experiment Parameters</h1>
      <form action="/run" method="post">
        <label>newMatcher:<br /><input type="number" name="newMatcher" required /></label>
        <label>newClient:<br /><input type="number" name="newClient" required /></label>
        <label>publish:<br /><input type="number" name="publish" required /></label>
        <label>subscribe:<br /><input type="number" name="subscribe" required /></label>
        <label>moveClient:<br /><input type="number" name="moveClient" required /></label>
        <button type="submit">Run Experiment</button>
      </form>
      <div id="expstat">
      <h1> Experiment Status </h1>
      <label>Network Operations Created</label>
      <button type="submit">Run Simulator</button>
</div>
    </body>
    </html>
      `;
      res.send(combinedHTML);
    }
  );
});

app.listen(3000, () => {
  console.log("Server is running at http://localhost:3000");
});
