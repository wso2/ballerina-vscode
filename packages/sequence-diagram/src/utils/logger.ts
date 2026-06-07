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

export enum ConsoleColor {
    RED = "red",
    BLUE = "blue",
    GREEN = "green",
    YELLOW = "yellow",
    ORANGE = "orange",
    PURPLE = "purple",
    PINK = "pink",
    GRAY = "gray",
    AUTO = "auto",
}

export function logger(message: string, color?: ConsoleColor, ...params: any[]) {
    // return; // Comment this line to enable logging

    if (color === ConsoleColor.AUTO) {
        console.log(`>>> ${message}`, ...params);
        return;
    }

    const logStyle = color ? `color: ${color};` : "";
    console.log(`>>> %c${message}`, logStyle, ...params);
}
