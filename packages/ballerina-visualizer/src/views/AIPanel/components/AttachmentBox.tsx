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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */

import styled from "@emotion/styled";
import { AttachmentStatus } from "@wso2/ballerina-core";
import { Codicon } from "@wso2/ui-toolkit";

export const AttachmentsContainer = styled.div`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin: 8px 0;
`;

const Attachment = styled.div<{ status: AttachmentStatus }>`
    display: flex;
    flex-direction: row;
    align-items: center;
    border: 1px
        ${({ status }: { status: AttachmentStatus }) => (status === AttachmentStatus.Success ? "solid" : "dashed")}
        var(--vscode-disabledForeground);
    background-color: transparent;
    border-radius: 4px;
    font-size: 12px;
    height: calc(1em + 8px);
`;

const IconWrapper = styled.div`
    margin-left: 4px;
    margin-right: 4px;
    display: flex;
    align-items: center;
`;

const Filename = styled.span<{ status: AttachmentStatus }>`
    margin-right: 8px;
    font-size: 12px;
    font-style: ${({ status }: { status: AttachmentStatus }) =>
        status === AttachmentStatus.Success ? "normal" : "italic"};
    text-decoration: ${({ status }: { status: AttachmentStatus }) =>
        status === AttachmentStatus.Success ? "none" : "line-through"};
    color: ${({ status }: { status: AttachmentStatus }) =>
        status === AttachmentStatus.Success ? "var(--vscode-inputForeground)" : "var(--vscode-disabledForeground)"};
`;

const ErrorMessage = styled.span`
    margin-right: 8px;
    font-size: 10px;
    color: var(--vscode-badge-background);
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    color: var(--vscode-disabledForeground);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-right: 4px;
    padding-left: 0;
`;

interface AttachmentBoxProps {
    status: AttachmentStatus;
    fileName: string;
    index: number;
    removeAttachment: (index: number) => void;
    readOnly?: boolean;
}

const getFileIcon = (fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    switch (extension) {
        case "json":
        case "xml":
        case "yaml":
            return (
                <span
                    className={`codicon codicon-file-code`}
                    style={{
                        height: "12px",
                        width: "12px",
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                ></span>
            );
        default:
            return (
                <span
                    className={`codicon codicon-file`}
                    style={{
                        height: "12px",
                        width: "12px",
                        fontSize: "12px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                ></span>
            );
    }
};

const AttachmentBox: React.FC<AttachmentBoxProps> = ({
    status,
    fileName,
    index,
    removeAttachment,
    readOnly = false,
}) => {
    return (
        <Attachment status={status}>
            <IconWrapper>{getFileIcon(fileName)}</IconWrapper>
            <Filename status={status}>{fileName}</Filename>
            {status !== AttachmentStatus.Success && (
                <ErrorMessage>
                    {status === AttachmentStatus.FileSizeExceeded && "Too Large"}
                    {status === AttachmentStatus.UnsupportedFileFormat && "Invalid Type"}
                    {status === AttachmentStatus.UnknownError && "Unknown"}
                </ErrorMessage>
            )}
            {!readOnly && (
                <CloseButton onClick={() => removeAttachment(index)}>
                    <Codicon name="close" />
                </CloseButton>
            )}
        </Attachment>
    );
};

export default AttachmentBox;
