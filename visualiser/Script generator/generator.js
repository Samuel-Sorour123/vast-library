const fs = require("fs");

function writeFile(filename, instructions) {
  fs.writeFile(filename, instructions, function callback(err) {
    if (err) {
      // An error occurred during the file write operation
      console.error("Error writing to file", err);
    } else {
      // File was written successfully
      console.log("File written successfully");
    }
  });
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  let randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomNumber;
}

function probabilisticChoice(p1, p2, p3) {
  if (p1 + p2 + p3 !== 1) {
    throw new Error("Probabilities must add up to 1");
  }

  const randomNumber = Math.random();

  if (randomNumber < p1) {
    return 1;
  } else if (randomNumber < p1 + p2) {
    return 2;
  } else i(randomNumber < p1 + p2 + p3);
  {
    return 3;
  }
}

function generateWaitInsruction(minLength, maxLength) {
  let length = getRandomInt(minLength, maxLength);
  let instruction = "wait " + length.toString();
}

function createMatchers(numMatchers, distribution) {
  var instructions = "";
  var matcherID = 1;

  if (distribution == 1) {
    let spacing = Math.floor(1000 / (Math.sqrt(numMatchers) + 1));
    let rowNumber = Math.sqrt(numMatchers);
    for (let x = spacing; x <= rowNumber * spacing; x = x + spacing) {
      for (y = spacing; y <= rowNumber * spacing; y = y + spacing) {
        if (matcherID == 1) {
          instructions =
            instructions +
            "newMatcher GW true localhost 8000 8001 20000 " +
            x.toString() +
            " " +
            y.toString() +
            " 100\nwait 100";
        } else {
          instructions =
            instructions +
            "\nnewMatcher M" +
            matcherID.toString() +
            " false localhost 8000 " +
            ((matcherID - 1) * 10 + 8000).toString() +
            " " +
            ((matcherID - 1) * 10 + 20000).toString() +
            " " +
            x.toString() +
            " " +
            y.toString() +
            " 100\nwait 100";
        }
        matcherID++;
      }
    }
  } else if (distribution == 2) {
    for (let matcher = 1; matcher <= numMatchers; matcher++) {
      let x = getRandomInt(0, 1000);
      let y = getRandomInt(0, 1000);

      if (matcher == 1) {
        instructions =
          instructions +
          "newMatcher GW true localhost 8000 8001 20000 " +
          x.toString() +
          " " +
          y.toString() +
          " 100\nwait 100";
      } else {
        instructions =
          instructions +
          "\nnewMatcher M" +
          matcher.toString() +
          " false localhost 8000 " +
          ((matcher - 1) * 10 + 8000).toString() +
          " " +
          ((matcher - 1) * 10 + 20000).toString() +
          " " +
          x.toString() +
          " " +
          y.toString() +
          " 100\nwait 100";
      }
    }
  }
  return instructions;
}

function createClients(numClients, distribution) {
  var instructions = "";
  var clientID = 1;

  if (distribution == 1) {
    let spacing = Math.floor(1000 / (Math.sqrt(numClients) + 1));
    let rowNumber = Math.sqrt(numClients);
    for (let x = spacing; x <= rowNumber * spacing; x = x + spacing) {
      for (y = spacing; y <= rowNumber * spacing; y = y + spacing) {
        instructions =
          instructions +
          "\nnewClient C" +
          clientID.toString() +
          " localhost 20000 " +
          x.toString() +
          " " +
          y.toString() +
          " 100\nwait 100";
        clientID++;
      }
    }
  } else if (distribution == 2) {
    for (let client = 1; client <= numClients; client++) {
      let x = getRandomInt(0, 1000);
      let y = getRandomInt(0, 1000);
      instructions =
        instructions +
        "\nnewClient C" +
        client.toString() +
        " localhost 20000 " +
        x.toString() +
        " " +
        y.toString() +
        " 100\nwait 100";
    }
  }
  return instructions;
}

function generateRandomInstruction(prob1, prob2, prob3) {
  var type = probabilisticChoice(prob1, prob2, prob3);

  switch (type){
    case 1:
      
  }
}

var matchers = createMatchers(9, 1);
var clients = createClients(16, 2);
console.log(clients);
var instructions = matchers + "\n" + clients + "\nend";
writeFile("./../script.txt", instructions);
