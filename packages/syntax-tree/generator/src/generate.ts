import * as fs from 'fs';
import { sync as globSync } from 'glob';
import * as path from 'path';
import {
    findModelInfo,
    genBaseVisitorFileCode,
    genCheckKindUtilCode,
    genInterfacesFileCode,
} from './generators';
import { genSyntaxTree, restart, shutdown } from './lang-client';
import gitly from 'gitly';
// eslint-disable-next-line
const format = require('prettier-eslint');

export const TEST_SUFFIX = '';
const GITHUB_TAG = process.env.GITHUB_TAG || 'master';
const TEMP_REPO_PATH = 'temp';
const SYNTAX_TREE_INTERFACES_PATH =
    '../src/syntax-tree-interfaces' + TEST_SUFFIX + '.ts';
const BASE_VISITOR_PATH = '../src/base-visitor' + TEST_SUFFIX + '.ts';
const CHECK_KIND_UTIL_PATH = '../src/check-kind-util' + TEST_SUFFIX + '.ts';
const CACHE_REPO = false;

const ignoredBalFiles: string[] = ['ballerina-lang/tests/jballerina-unit-test/src/test/resources/test-src/bala/test_projects/'];

const modelInfo: any = {};
let balFiles: string[] = [];
const triedBalFiles: string[] = [];
const skippedBalFiles: string[] = [];
const notParsedBalFiles: string[] = [];
const usedBalFiles: string[] = [];
const timedOutBalFiles: string[] = [];
const start = Date.now();
let downloadEnd = 0;
let generationEnd = 0;

processFiles();

async function processFiles() {
    logMessage('Library files generation time');
    balFiles = await downloadExamples();

    for (const file of balFiles) {
        if (isIgnoredFile(file)) {
            continue;
        }
        let timeoutTriggered = false;
        let gotST = false;
        triedBalFiles.push(file);
        try {
            const timeout = new Promise((resolve, reject) => {
                setTimeout(() => {
                    if (gotST) {
                        return;
                    }
                    timedOutBalFiles.push(file);
                    logMessage(`Timeout Triggered for ${file}`);
                    timeoutTriggered = true;
                    resolve(undefined);
                }, 10000);
            });
            const syntaxTree = await Promise.race([genSyntaxTree(file), timeout]);
            if (!syntaxTree) {
                if (timeoutTriggered) {
                    await restart();
                }
                // could not parse
                notParsedBalFiles.push(file);
                continue;
            } else {
                gotST = true;
            }
            usedBalFiles.push(file);
            findModelInfo(syntaxTree, modelInfo);
        } catch (err) {
            notParsedBalFiles.push(file);
            logMessage(err);
        }
    }

    await genFiles();
    shutdown();
    await removeExamples();

    generationEnd = Date.now();

    printSummary();
}

async function downloadExamples() {
    logMessage('Downloading example repos...');

    const distResponse = await gitly(
        'ballerina-platform/ballerina-distribution#' + GITHUB_TAG,
        TEMP_REPO_PATH + '/ballerina-distribution',
        { cache: CACHE_REPO, force: true }
    );
    const langResponse = await gitly(
        'ballerina-platform/ballerina-lang#' + GITHUB_TAG,
        TEMP_REPO_PATH + '/ballerina-lang',
        { cache: CACHE_REPO, force: true }
    );
    if (distResponse.length !== 2 || langResponse.length !== 2) {
        logMessage(
            'Something went wrong when downloading example bal files.',
            distResponse,
            langResponse
        );
        process.exit(1);
    }

    downloadEnd = Date.now();
    logMessage('Example repos have been downloaded', distResponse, langResponse);

    const distBalFiles = globSync(path.join(distResponse[1], '**', '*.bal'), {});
    const langBalFiles = globSync(
        path.join(langResponse[1], 'tests', '**', '*.bal'),
        {}
    );
    return [ ...distBalFiles, ...langBalFiles ];
}

function removeExamples() {
    fs.rmSync(TEMP_REPO_PATH, { force: true, recursive: true });
    logMessage('Example repos have been removed');
}

async function genFiles() {
    const syntaxKinds = genInterfacesFileCode(modelInfo);
    const fmtSyntaxKinds = await formatSource(syntaxKinds);
    fs.writeFileSync(SYNTAX_TREE_INTERFACES_PATH, fmtSyntaxKinds);

    const modelNames = Object.keys(modelInfo).sort();
    const visitors = genBaseVisitorFileCode(modelNames);
    const fmtVisitors = await formatSource(visitors);
    fs.writeFileSync(BASE_VISITOR_PATH, fmtVisitors);

    const checkers = genCheckKindUtilCode(modelNames);
    const fmtCheckers = await formatSource(checkers);
    fs.writeFileSync(CHECK_KIND_UTIL_PATH, fmtCheckers);
}

async function formatSource(source: string) {
    const options = {
        text: source,
        prettierOptions: {
            parser: 'typescript',
            arrowParens: 'always',
            bracketSameLine: false,
            bracketSpacing: true,
            embeddedLanguageFormatting: 'auto',
            htmlWhitespaceSensitivity: 'css',
            insertPragma: false,
            jsxSingleQuote: false,
            printWidth: 158,
            proseWrap: 'preserve',
            quoteProps: 'as-needed',
            requirePragma: false,
            semi: true,
            singleAttributePerLine: false,
            singleQuote: false,
            tabWidth: 4,
            trailingComma: 'es5',
            useTabs: false,
            vueIndentScriptAndStyle: false,
        },
    };
    return await format(options);
}

function printSummary() {
    const found = balFiles.length;
    const skipped = skippedBalFiles.length;
    const notParsed = notParsedBalFiles.length;
    const used = usedBalFiles.length;
    const timedOut = timedOutBalFiles.length;

    logMessage(`${found} Files found`);
    logMessage(`${skipped} Files were skipped`);
    logMessage(`${notParsed} Could not be parsed`);
    logMessage(`${used} Used for util generation`);
    logMessage(`${timedOut} timed out while parsing`);
    if (downloadEnd) {
        logMessage(`Example repos download time ${downloadEnd - start} ms`);
    }
    if (generationEnd) {
        logMessage(`Library files generation time ${generationEnd - start} ms`);
    }
}

// Ignoring some files due to syntax tree generation issues
function isIgnoredFile(fileName: string) {
    for (var i = 0; i < ignoredBalFiles.length; i++) {
        if (fileName.indexOf(ignoredBalFiles[i]) > 0) {
            skippedBalFiles.push(fileName);
            return true;
        }
    }
    return false;
}

function logMessage(message: string, ...optionalParams: any[]) {
    // eslint-disable-next-line
    console.log(message, ...optionalParams);
}
