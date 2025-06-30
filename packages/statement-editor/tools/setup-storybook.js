const fetch = require('node-fetch');
var glob = require('glob');
const { writeFile, existsSync } = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const { WSConnection, BalleriaLanguageClient } = require("@wso2/ballerina-core")

const MOCK_SERVER_URL = "http://localhost:3000"
const LANG_SERVER_URL = "ws://localhost:9095"


function setupDevBalProject() {
    const storyDataDir = path.join(__dirname, "..", "src", "stories", "data");
    let devProjectFolder = path.join(storyDataDir, "project");
    if (process.env.LOW_CODE_DEV_PROJECT_PATH) {
        devProjectFolder = process.env.LOW_CODE_DEV_PROJECT_PATH;
        console.log("Dev Project Path is set via env var LOW_CODE_DEV_PROJECT_PATH. Path: " + devProjectFolder)
    } else {
        console.log("Using default dev project path. Override using LOW_CODE_DEV_PROJECT_PATH env var.")
    }
    if (existsSync(devProjectFolder)) {
        console.log("Development project alreay exists at " + devProjectFolder)
    } else {
        const projectName = path.parse(devProjectFolder).name;
        const cwd = path.resolve(path.parse(devProjectFolder).dir);
        console.log(cwd)
        const balNewOutput = execSync("bal new " + projectName, { cwd }).toString().trim();
        if (balNewOutput.startsWith("Created new")) {
            console.log("Initialized new Ballerina Project at " + devProjectFolder)
        } else {
            console.log("Unable to initialize new Ballerina project at " + devProjectFolder)
        }
    }


        writeFile(path.join(storyDataDir, "devproject.json"),
`
{
    "projectPath": "${devProjectFolder}/"
}
`    ,
    (err) => err ? console.log("dev project json make error: " + err ) : console.log("dev project json make successful")
    );    
    
}

function startLS() {
    const ls = spawn('npx', ['start-ws-lang-server']);

    ls.stdout.on('data', (data) => {
        console.log(`lang-server:stdout: ${data}`);
    });

    ls.stderr.on('data', (data) => {
        console.error(`lang-server:stderr: ${data}`);
    });

    ls.on('close', (code) => {
        console.log(`lang-server:process exited with code ${code}`);
    });
}

function startVSCodeMockServer() {
    const vs = spawn('node', ['../low-code-integration-tests/tools/vscode-mock-server.js']);

    vs.stdout.on('data', (data) => {
        console.log(`vs-mock-server:stdout: ${data}`);
    });

    vs.stderr.on('data', (data) => {
        console.error(`vs-mock-server:stderr: ${data}`);
    });

    vs.on('close', (code) => {
        console.log(`vs-mock-server:process exited with code ${code}`);
    });
}


  
async function getFileContent(filePath) {
    return fetch(MOCK_SERVER_URL + "/file/" + encodeURIComponent(filePath))
    .then(response => {
        return response.text()
    })
}

async  function fetchSyntaxTree(filePath, langClientPromise) {
    const text = await getFileContent(filePath);
  const langClient = await langClientPromise;
  const uri = `file://${filePath}`;

  await langClient.didOpen({
    textDocument: {
      languageId: "ballerina",
      text,
      uri,
      version: 1
    }
  });
  const syntaxTreeResponse = await langClient.getSyntaxTree({
    documentIdentifier: {
      uri
    }
  });

  const syntaxTree = syntaxTreeResponse.syntaxTree;

  langClient.didClose({
    textDocument: {
      uri,
    }
  });

  return syntaxTree;
}
    
const syntaxTreeList = Object.create(null);
async function setUpSyntaxTreeJSON(){
    const projectRoot = path.join(__dirname, "..");
    const sourceRoot = path.join(projectRoot, "src");
    const storyDataDir = path.join(sourceRoot, "stories", "data");
    let devProjectFolder = path.join(storyDataDir, "project");
    if (process.env.LOW_CODE_DEV_PROJECT_PATH) {
        devProjectFolder = process.env.LOW_CODE_DEV_PROJECT_PATH;
        console.log("Dev Project Path is set via env var LOW_CODE_DEV_PROJECT_PATH. Path: " + devProjectFolder)
    } else {
        console.log("Using default dev project path. Override using LOW_CODE_DEV_PROJECT_PATH env var.")
    }
    if (existsSync(devProjectFolder)) {
        console.log("Development project alreay exists at " + devProjectFolder)
    } else {
        const projectName = path.parse(devProjectFolder).name;
        const cwd = path.resolve(path.parse(devProjectFolder).dir);
        console.log(cwd)
        const balNewOutput = execSync("bal new " + projectName, { cwd }).toString().trim();
        if (balNewOutput.startsWith("Created new")) {
            console.log("Initialized new Ballerina Project at " + devProjectFolder)
        } else {
            console.log("Unable to initialize new Ballerina project at " + devProjectFolder)
        }
    }

    const langClientPromise = WSConnection.initialize(LANG_SERVER_URL).then((wsConnection) => {
        return new BalleriaLanguageClient(wsConnection);
      });
    const jsonFileList  = [];

    glob(path.join(devProjectFolder, '**/*.bal'), async function (err, files) {
        files.forEach(async function (file ){
            const fileName = (file.split("/")).slice(-1)
            console.log(file)
            const st = await fetchSyntaxTree(file, langClientPromise);
            setTimeout(() => writefl( st, storyDataDir , fileName), 4000);
        });

    });

}

function writefl(syntaxTree, storyDataDir, file){
    syntaxTreeList[file] =syntaxTree;
    writeFile(path.join(storyDataDir, "syntaxTreeList.json"), 
        `${JSON.stringify(syntaxTreeList)}`  ,
    (err) => err ? console.log("syntaxTreeList json make error: " + err) : console.log("syntaxTreeList json make successful"))

}

function startStoryBook() {
    const sb = spawn('npx', ['start-storybook', '-p', '6006']);

    sb.stdout.on('data', (data) => {
        console.log(`storybook: ${data}`);
    });

    sb.stderr.on('data', (data) => {
        if (!data.includes("webpack.Progress") && !data.includes("webpack-dev-middleware")) {
            console.log(`storybook: ${data}`);
        }
    });

    sb.on('close', (code) => {
        console.log(`storybook:process exited with code ${code}`);
    });
}

setupDevBalProject();
startLS();
startVSCodeMockServer();
setTimeout(() => setUpSyntaxTreeJSON(), 3000 );

setTimeout(() => startStoryBook(), 8000 );
