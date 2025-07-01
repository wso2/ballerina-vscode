/*
 *  Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 * 
 *  This software is the property of WSO2 LLC. and its suppliers, if any.
 *  Dissemination of any information or reproduction of any material contained
 *  herein is strictly forbidden, unless permitted by WSO2 in accordance with
 *  the WSO2 Commercial License available at http://wso2.com/licenses.
 *  For specific language governing the permissions and limitations under
 *  this license, please see the license as well as any agreement you’ve
 *  entered into with WSO2 governing the purchase of this software and any
 *  associated services.
 */

import { downloadAndUnzipVSCode } from '@vscode/test-electron';
import { defaultCachePath } from '@vscode/test-electron/out/download';
import { TestOptions } from '@vscode/test-electron/out/runTest';
import * as cp from 'child_process';
import * as path from 'path';

/**
 * Run VS Code extension test
 *
 * @returns The exit code of the command to launch VS Code extension test
 */
export async function runTests(options: TestOptions): Promise<number> {
	if (!options.vscodeExecutablePath) {
		options.vscodeExecutablePath = await downloadAndUnzipVSCode(options);
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