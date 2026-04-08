/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

const fs = require('fs').promises;
const path = require('path');

async function main() {
    try {
        const targetDir = path.resolve(__dirname, '..', 'ballerina-extension', 'resources', 'jslibs');
        await fs.access(targetDir);
    } catch (e) {
        console.log('Target jslibs directory not found, skipping cleanup.');
        return;
    }

    const targetDir = path.resolve(__dirname, '..', 'ballerina-extension', 'resources', 'jslibs');
    try {
        const entries = await fs.readdir(targetDir, { withFileTypes: true });
        const deletes = entries
            .filter((d) => d.isFile() && /^[0-9].*\.js$/.test(d.name))
            .map((d) => fs.unlink(path.join(targetDir, d.name)));

        if (deletes.length === 0) {
            console.log('No versioned JS files to remove.');
            return;
        }

        await Promise.all(deletes);
        console.log(`Removed ${deletes.length} versioned JS file(s) from ${targetDir}`);
    } catch (err) {
        console.error('Error cleaning jslibs directory:', err);
        process.exitCode = 1;
    }
}

main();
