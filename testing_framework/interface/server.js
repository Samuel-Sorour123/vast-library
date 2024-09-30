const express = require("express");
const app = express();
const { execFile } = require("child_process");
const path = require("path");


app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
  res.render("index");
})

app.get("/option1", (req, res) => {
  res.render("option1_form");
})

// Handle form submission for Option 1
app.post('/option1/run', (req, res) => {
  const experimentParams = {
    newMatcher: parseInt(req.body.newMatcher, 10),
    newClient: parseInt(req.body.newClient, 10),
    publish: parseInt(req.body.publish, 10),
    subscribe: parseInt(req.body.subscribe, 10),
    moveClient: parseInt(req.body.moveClient, 10),
  };

  const experimentParamsJson = JSON.stringify(experimentParams);
  const experimentScriptPath = path.join(__dirname, '../generator/experiment2.js');

  // Use execFile to execute the script without a shell
  execFile('node', [experimentScriptPath, experimentParamsJson], (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      res.render('result', { output: `Error: ${error.message}` });
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout:\n${stdout}`);
    res.render('result', { output: stdout });
  });
});

// Routes for Option 2 and Option 3 can be added similarly
// app.get('/option2', ...);
// app.post('/option2/run', ...);
// app.get('/option3', ...);
// app.post('/option3/run', ...);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});