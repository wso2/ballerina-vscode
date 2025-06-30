import { StdioConnection, BalleriaLanguageClient } from "@wso2/ballerina-core";
import { readFileSync } from 'fs';
import URI from "vscode-uri";

let bls = new BalleriaLanguageClient(new StdioConnection(process.env.BALLERINA_SDK_PATH));

export function shutdown() {
    bls.onReady().then(() => {
        bls.stop()
    })
}

export async function restart() {
    bls.stop();
    bls = new BalleriaLanguageClient(new StdioConnection(process.env.BALLERINA_SDK_PATH));
    return bls.onReady();
}

export async function genSyntaxTree(balFilePath: string) {
    const uri =  URI.file(balFilePath).toString();
    let syntaxTree;
    try {
        const data = readFileSync(balFilePath, 'utf8')
        await bls.onReady();
        bls.didOpen({
            textDocument: {
                uri,
                languageId: "ballerina",
                text: data,
                version: 1
            }
        });

        const astResp = await bls.getSyntaxTree({
            documentIdentifier: { uri }
        });
        syntaxTree = astResp.syntaxTree;
        bls.didClose({ textDocument: { uri } });

    } catch (e) {
        // tslint:disable-next-line:no-console
        console.log(`Error when parsing ${balFilePath} \n ${e}`);
    }
    return syntaxTree;
}
