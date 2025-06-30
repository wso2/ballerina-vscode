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

import { window } from "vscode";

export enum MESSAGE_TYPE {
    ERROR,
    WARNING,
    INFO,
    CLICKABLE_INFO,
    IGNORE
}

const DONT_SHOW = "Don't show again!";
const AVOIDED: string[] = [];

/**
 * Show vs code message popup.
 * @param message Message to display
 * @param type Message type
 * @param isIgnorable Is ignorable message
 */
export function showMessage(message: string, type: MESSAGE_TYPE, isIgnorable: boolean, filePath?: string, fileContent?: string, callBack?: (filePath: string, fileContent: string) => void) {
    if (AVOIDED.includes(message) || message === 'IGNORE') {
        return;
    }

    const button: string[] = isIgnorable ? [DONT_SHOW] : [];
    switch (type) {
        case MESSAGE_TYPE.ERROR: {
            window.showErrorMessage(message, ...button).then((response) => {
                addToAvoidList(response, message);
            });
            break;
        }
        case MESSAGE_TYPE.WARNING: {
            window.showWarningMessage(message, ...button).then((response) => {
                addToAvoidList(response, message);
            });
            break;
        }
        case MESSAGE_TYPE.INFO: {
            window.showInformationMessage(message, ...button).then((response) => {
                addToAvoidList(response, message);
            });
            break;
        }
        case MESSAGE_TYPE.CLICKABLE_INFO: {
            window.showInformationMessage(message, 'Resolve').then((response) => {
                if (response === "Resolve" && callBack && filePath && fileContent) {
                    callBack(filePath, fileContent);
                }
            });
            break;
        }
        case MESSAGE_TYPE.IGNORE: {
            break;
        }
    }
}

function addToAvoidList(response, message) {

    if (response === DONT_SHOW) {

        AVOIDED.push(message);
    }
}
