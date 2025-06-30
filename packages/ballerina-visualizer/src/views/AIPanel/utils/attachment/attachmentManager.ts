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

import { ChangeEvent } from "react";
import { DataMapperAttachment } from "./dataMapperAttachment";
import { Attachment, Command } from "@wso2/ballerina-core";
import { GeneralAttachment } from "./generalAttachment";

/**
 * Allowed file types for text-based commands.
 * Adjust these as needed for your application logic.
 */
const TEXT_BASED_TYPES = [
    "text/plain",
    "text/csv",
    "text/xml",
    "text/markdown",
    "application/json",
    "application/x-yaml",
    "application/xml",
    ".sql",
    ".graphql",
    ".md",
    "",
];

/**
 * Allowed file types for commands expecting documents/images.
 */
const DOCUMENT_TYPES = [
    "text/plain",
    "text/csv",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/heic",
    "image/heif",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
];

/**
 * Returns a list of valid file types for a given command.
 */
export const getFileTypesForCommand = (command: Command | null): string[] => {
    switch (command) {
        case Command.DataMap:
        case Command.TypeCreator:
            return DOCUMENT_TYPES;
        default:
            return TEXT_BASED_TYPES;
    }
};

/**
 * Utility to build the string for the 'accept' attribute of <input type="file" />.
 */
export const acceptResolver = (command: Command | null): string => {
    if (!command) {
        return TEXT_BASED_TYPES.join(",");
    }
    return getFileTypesForCommand(command).join(",");
};

/**
 * Dynamically selects an attachment handler based on the command,
 * then processes and returns the results of uploading the file(s).
 */
export const handleAttachmentSelection = async (
    e: ChangeEvent<HTMLInputElement>,
    command: Command | null
): Promise<Attachment[]> => {

    let attachmentHandler;

    switch (command) {
        case Command.DataMap:
        case Command.TypeCreator:
            attachmentHandler = new DataMapperAttachment(command);
            break;
        default:
            attachmentHandler = new GeneralAttachment(command);
    }

    const results = await attachmentHandler.handleFileAttach(e);
    return results;
};
