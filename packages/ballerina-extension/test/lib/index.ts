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

import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath } from '@vscode/test-electron';
import { defaultCachePath } from '@vscode/test-electron/out/download';
import { TestOptions } from '@vscode/test-electron/out/runTest';
import * as cp from 'child_process';
import * as path from 'path';
const packageJson = require('../../../package.json')

/**
 * Run VS Code extension test
 *
 * @returns The exit code of the command to launch VS Code extension test
 */
export async function runTests(options: TestOptions): Promise<number> {
	if (!options.vscodeExecutablePath) {
		options.vscodeExecutablePath = await downloadAndUnzipVSCode(options);
		const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(options.vscodeExecutablePath)
		if (packageJson.extensionDependencies) {
			for (const extensionId of packageJson.extensionDependencies) {
				cp.spawnSync(cli, [...args, '--install-extension', extensionId], {
					encoding: 'utf-8',
					stdio: 'inherit',
				})
			}
		}
	}

	let args = [
		// https://github.com/microsoft/vscode/issues/84238
		'--no-sandbox',
		// https://github.com/microsoft/vscode-test/issues/120
		'--disable-updates',
		'--skip-welcome',
		'--skip-release-notes',
		'--disable-workspace-trust',
		'--extensionTestsPath=' + options.extensionTestsPath
	];

	if (Array.isArray(options.extensionDevelopmentPath)) {
		args.push(...options.extensionDevelopmentPath.map(devPath =>
			`--extensionDevelopmentPath=${devPath}`));
	} else {
		args.push(`--extensionDevelopmentPath=${options.extensionDevelopmentPath}`);
	}

	if (options.launchArgs) {
		args = options.launchArgs.concat(args);
	}

	if (!options.reuseMachineInstall) {
		args.push(...getProfileArguments(args));
	}

	return innerRunTests(options.vscodeExecutablePath, args, options.extensionTestsEnv);
}

/** Adds the extensions and user data dir to the arguments for the VS Code CLI */
export function getProfileArguments(args: readonly string[]) {
	const out: string[] = [];
	if (!hasArg('extensions-dir', args)) {
		out.push(`--extensions-dir=${path.join(defaultCachePath, 'extensions')}`);
	}

	if (!hasArg('user-data-dir', args)) {
		out.push(`--user-data-dir=${path.join('/tmp', 'vscode-user-data')}`);
		// out.push(`--user-data-dir=${path.join(defaultCachePath, 'user-data')}`);
	}

	return out;
}

function hasArg(argName: string, argList: readonly string[]) {
	return argList.some(a => a === `--${argName}` || a.startsWith(`--${argName}=`));
}

async function innerRunTests(
	executable: string,
	args: string[],
	testRunnerEnv?: {
		[key: string]: string | undefined;
	}
): Promise<number> {
	return new Promise<number>((resolve, reject) => {
		const fullEnv = Object.assign({}, process.env, testRunnerEnv);
		const cmd = cp.spawn(executable, args, { env: fullEnv });

		cmd.stdout.on('data', function (data) {
			console.log(data.toString());
		});

		cmd.stderr.on('data', function (data) {
			console.error(data.toString());
		});

		cmd.on('error', function (data) {
			console.log('Test error: ' + data.toString());
		});

		let finished = false;
		function onProcessClosed(code: number | null, signal: NodeJS.Signals | null): void {
			if (finished) {
				return;
			}
			finished = true;
			console.log(`Exit code:   ${code ?? signal}`);

			if (code === null) {
				reject(signal);
			} else if (code !== 0) {
				reject('Failed');
			} else {
				console.log('Done\n');
				resolve(code ?? -1);
			}
		}

		cmd.on('close', onProcessClosed);

		cmd.on('exit', onProcessClosed);
	});
}