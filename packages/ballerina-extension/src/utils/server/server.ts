/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { delimiter, join } from 'path';
import { debug, log } from '../logger';
import { ServerOptions, ExecutableOptions } from 'vscode-languageclient/node';
import { isWindows } from '..';
import { BallerinaExtension } from '../../core';
import { isSupportedSLVersion } from '../config';
import * as fs from 'fs';
import * as path from 'path';
import { orderBy } from 'lodash';

interface JdkInfo {
    name: string;
    version: string;
    fullPath: string;
    parsedVersion: number[];
    buildNumber: number;
}

function findFileByPattern(directory: string, pattern: RegExp): string | null {
    try {
        if (!fs.existsSync(directory)) {
            return null;
        }
        const files = fs.readdirSync(directory);
        const matchingFile = files.find(file => pattern.test(file));
        return matchingFile ? path.join(directory, matchingFile) : null;
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return null;
    }
}

function findJarsExcludingPatterns(directory: string, excludePatterns: string[]): string[] {
    try {
        if (!fs.existsSync(directory)) {
            return [];
        }
        const files = fs.readdirSync(directory);
        const matchingJars: string[] = [];
        
        const compiledPatterns = excludePatterns.map(pattern => new RegExp(pattern.replace(/\*/g, '.*')));
        
        files.forEach(file => {
            if (file.endsWith('.jar')) {
                const shouldExclude = compiledPatterns.some(regex => regex.test(file));
                
                if (!shouldExclude) {
                    matchingJars.push(path.join(directory, file));
                }
            }
        });
        
        return matchingJars;
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return [];
    }
}

function parseJdkVersion(versionString: string): { parsedVersion: number[], buildNumber: number } {
    const [mainVersion, buildPart] = versionString.split('+');
    
    const parsedVersion = mainVersion
        .split('.')
        .map(num => parseInt(num, 10) || 0);
    
    const buildNumber = parseInt(buildPart || '0', 10);
    
    return { parsedVersion, buildNumber };
}

function extractJdkInfo(fileName: string, directory: string): JdkInfo | null {
    const jdkPattern = /^jdk-(.+)-jre$/;
    const match = fileName.match(jdkPattern);
    if (!match) {
        return null;
    }
    
    const versionString = match[1];
    const { parsedVersion, buildNumber } = parseJdkVersion(versionString);
    
    return {
        name: fileName,
        version: versionString,
        fullPath: path.join(directory, fileName),
        parsedVersion,
        buildNumber
    };
}

export function findHighestVersionJdk(directory: string): string | null {
    try {
        if (!fs.existsSync(directory)) {
            debug(`Dependencies directory not found: ${directory}`);
            return null;
        }
        
        const files = fs.readdirSync(directory);
        debug(`Found files in dependencies directory: ${files.join(', ')}`);
        
        const jdkInfos = files
            .map(file => extractJdkInfo(file, directory))
            .filter((jdk): jdk is JdkInfo => jdk !== null);
        
        if (jdkInfos.length === 0) {
            debug(`No JDK directories found matching pattern in: ${directory}`);
            return null;
        }
        
        const sortedJdks = orderBy(jdkInfos, [
            // sort by major version (descending)
            (jdk: JdkInfo) => jdk.parsedVersion[0] || 0,
            // sort by minor version (descending)
            (jdk: JdkInfo) => jdk.parsedVersion[1] || 0,
            // sort by patch version (descending)
            (jdk: JdkInfo) => jdk.parsedVersion[2] || 0,
            // sort by build number (descending)
            (jdk: JdkInfo) => jdk.buildNumber
        ], ['desc', 'desc', 'desc', 'desc']);
        
        const highestVersionJdk = sortedJdks[0];
        
        debug(`Selected JDK: ${highestVersionJdk.name} at ${highestVersionJdk.fullPath}`);
        return highestVersionJdk.fullPath;
        
    } catch (error) {
        console.error(`Error reading directory ${directory}:`, error);
        return null;
    }
}

export function getServerOptions(extension: BallerinaExtension): ServerOptions {
    // Check if user wants to use Ballerina CLI language server or if version requires it
    const BI_SUPPORTED_MINIMUM_VERSION = 2201123; // 2201.12.3
    if (extension?.useDistributionLanguageServer() ||!isSupportedSLVersion(extension, BI_SUPPORTED_MINIMUM_VERSION) ) {
        return getServerOptionsUsingCLI(extension);
    } else {
        return getServerOptionsUsingJava(extension);
    }
}

function getServerOptionsUsingCLI(extension: BallerinaExtension): ServerOptions {
    const ballerinaCmd = extension.getBallerinaCmd();
    debug(`Using bal command to start language server.`);
    debug(`Using Ballerina CLI command '${ballerinaCmd}'`);
    
    let cmd = isWindows() ? 'cmd.exe' : ballerinaCmd;
    let args = ["start-language-server"];
    if (isWindows()) {
        args = ['/c', ballerinaCmd, 'start-language-server'];
    }
    
    let opt: ExecutableOptions = {};
    opt.env = Object.assign({}, process.env);

    if (process.env.LS_EXTENSIONS_PATH !== "") {
        if (opt.env.BALLERINA_CLASSPATH_EXT) {
            opt.env.BALLERINA_CLASSPATH_EXT += delimiter + process.env.LS_EXTENSIONS_PATH;
        } else {
            opt.env.BALLERINA_CLASSPATH_EXT = process.env.LS_EXTENSIONS_PATH;
        }
    }
    
    if (process.env.LSDEBUG === "true" || extension?.enableLSDebug()) {
        debug('Language Server is starting in debug mode.');
        let debugPort = 5005;
        opt.env.BAL_JAVA_DEBUG = debugPort;
        opt.env.BAL_DEBUG_OPTS = `-Xdebug -Xnoagent -Djava.compiler=NONE -Xrunjdwp:transport=dt_socket,server=y,suspend=y,address=${debugPort},quiet=y`;
    }

    if (process.env.LS_CUSTOM_CLASSPATH) {
        args.push('--classpath', process.env.LS_CUSTOM_CLASSPATH);
    }

    // Add custom JVM arguments from environment variable ( Example: LS_CUSTOM_ARGS="-arg1 -arg2=value")
    if (process.env.LS_CUSTOM_ARGS) {
        debug(`LS_CUSTOM_ARGS: ${process.env.LS_CUSTOM_ARGS}`);
        args.push(...process.env.LS_CUSTOM_ARGS.split(' '));
    }

    return {
        command: cmd,
        args,
        options: opt
    };
}

function getServerOptionsUsingJava(extension: BallerinaExtension): ServerOptions {
    debug(`Using java command to start language server.`);
    let opt: ExecutableOptions = {};
    opt.env = Object.assign({}, process.env);

    if (process.env.LS_EXTENSIONS_PATH !== "") {
        if (opt.env.BALLERINA_CLASSPATH_EXT) {
            opt.env.BALLERINA_CLASSPATH_EXT += delimiter + process.env.LS_EXTENSIONS_PATH;
        } else {
            opt.env.BALLERINA_CLASSPATH_EXT = process.env.LS_EXTENSIONS_PATH;
        }
    }
    
    let debugOpts = '';
    if (process.env.LSDEBUG === "true" || extension?.enableLSDebug()) {
        let debugPort = 5005;
        debug(`Language Server is running in debug mode on port ${debugPort}`);
        debugOpts = `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,quiet=y,address=*:${debugPort}`;
    }

    const ballerinaHome = isWindows() ? fs.realpathSync.native(extension?.getBallerinaHome()) : extension?.getBallerinaHome();
    // Get the base ballerina home by removing the distribution part
    const baseHome = ballerinaHome.includes('distributions') 
        ? ballerinaHome.substring(0, ballerinaHome.indexOf('distributions'))
        : ballerinaHome;
    
    // jar patterns to exclude
    const excludeJarPatterns = [
        'architecture-model*',
        'flow-model*',
        'graphql-model*',
        'model-generator*',
        'sequence-model*',
        'service-model*',
        'test-manager-service*',
        'language-server*',
        "bal-shell-service*",
        "org.eclipse.lsp4j*"
    ];

    // Generate paths for ballerina home jars using dynamic discovery (excluding specified patterns)
    const directoriesToSearch = [
        join(ballerinaHome, 'bre', 'lib'),
        join(ballerinaHome, 'lib', 'tools', 'lang-server', 'lib'),
        join(ballerinaHome, 'lib', 'tools', 'debug-adapter', 'lib')
    ];
    
    const ballerinaJarPaths = directoriesToSearch.flatMap(directory => 
        findJarsExcludingPatterns(directory, excludeJarPatterns)
    );
    
    ballerinaJarPaths.forEach(jarPath => {
        if (!fs.existsSync(jarPath)) {
            log(`Ballerina jar not found in ${jarPath}`);
        }
    });

    let ballerinaLanguageServerJar: string | null = null;
    const configuredLangServerPath = extension?.getConfiguredLangServerPath();
    
    if (configuredLangServerPath && configuredLangServerPath.trim() !== "") {
        debug(`Using custom language server path: ${configuredLangServerPath}`);
        // User provided custom language server path
        if (fs.existsSync(configuredLangServerPath)) {
            ballerinaLanguageServerJar = configuredLangServerPath;
        } else {
            debug(`Configured language server jar not found: ${configuredLangServerPath}`);
            throw new Error(`Configured language server JAR not found: ${configuredLangServerPath}`);
        }
    } else {
        debug(`Using bundled language server from ls directory.`);
        // Use bundled language server from ls directory
        const lsDir = extension?.context.asAbsolutePath("ls");    
        ballerinaLanguageServerJar = findFileByPattern(lsDir, /^ballerina-language-server.*\.jar$/);
        
        if (!ballerinaLanguageServerJar || !fs.existsSync(ballerinaLanguageServerJar)) {
            debug(`No ballerina language server jar found in: ${lsDir}`);
            throw new Error(`Language server JAR not found in ${lsDir}`);
        }
    }

    const jarName = path.basename(configuredLangServerPath || ballerinaLanguageServerJar);
    const versionMatch = jarName.match(/ballerina-language-server-(.+)\.jar$/);
    if (versionMatch) {
        log(`Language Server Version: ${versionMatch[1]}`);
    } else {
        debug(`Language Server JAR: ${jarName}`);
    }

    const customPaths = [...ballerinaJarPaths, ballerinaLanguageServerJar];
    if (process.env.LS_CUSTOM_CLASSPATH) {
        debug(`LS_CUSTOM_CLASSPATH: ${process.env.LS_CUSTOM_CLASSPATH}`);
        customPaths.push(process.env.LS_CUSTOM_CLASSPATH);
    }
    
    const classpath = customPaths.join(delimiter);
    
    // Find any JDK in the dependencies directory
    const dependenciesDir = join(baseHome, 'dependencies');
    const jdkDir = findHighestVersionJdk(dependenciesDir);
    
    if (!jdkDir) {
        debug(`No JDK found in dependencies directory: ${dependenciesDir}`);
        throw new Error(`JDK not found in ${dependenciesDir}`);
    }

    const jdkVersionMatch = jdkDir.match(/jdk-(.+)-jre/);
    if (jdkVersionMatch) {
        log(`JDK Version: ${jdkVersionMatch[1]}`);
    }
    
    const javaExecutable = isWindows() ? 'java.exe' : 'java';
    const cmd = join(jdkDir, 'bin', javaExecutable);
    const args = ['-cp', classpath, `-Dballerina.home=${ballerinaHome}`, 'org.ballerinalang.langserver.launchers.stdio.Main'];

    // Include debug options in the Java arguments if in debug mode
    if (debugOpts) {
        args.unshift(debugOpts);
    }
  
    // Add custom JVM arguments from environment variable ( Example: LS_CUSTOM_ARGS="-arg1 -arg2=value")
    if (process.env.LS_CUSTOM_ARGS) {
        debug(`LS_CUSTOM_ARGS: ${process.env.LS_CUSTOM_ARGS}`);
        args.push(...process.env.LS_CUSTOM_ARGS.split(' '));
    }
    
    const serverOptions = {
        command: cmd,
        args,
        options: opt
    };
    
    return serverOptions;
}
