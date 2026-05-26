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
import React from "react";
import { Button, Icon, Typography } from "@wso2/ui-toolkit";

export interface FileSelectorProps {
    label: string;
    extension: "json" | "yaml" | "xml"; // TODO: support for yaml js-yaml library
    onReadFile: (text: string) => void;
}

export function FileSelector(props: FileSelectorProps) {
    const { extension, label, onReadFile } = props;

    const hiddenFileInput = React.useRef(null);

    const handleClick = (event?: any) => {
        hiddenFileInput.current.click();
    };

    const showFile = async (e: any) => {
        e.preventDefault();
        const reader = new FileReader();
        const ext = e.target.files[0].name.split(".").pop().toLowerCase();
        reader.readAsText(e.target.files[0]);
        reader.onload = async (loadEvent: any) => {
            if (ext === extension) {
                const text = loadEvent.target.result as string;
                onReadFile(text);
            }
        };
    };

    return (
        <React.Fragment>
            <input hidden={true} accept={`.${extension}`} type="file" onChange={showFile} ref={hiddenFileInput} />
            <Button onClick={handleClick} appearance="icon">
                <Icon
                    name="file-upload"
                    sx={{ height: "18px", width: "18px", marginRight: "4px" }}
                    iconSx={{ fontSize: "18px", color: "var(--vscode-charts-purple)" }}
                />
                <Typography
                    variant="body3"
                    sx={{ color: "var(--vscode-charts-purple)" }}
                >{`Upload ${extension.toUpperCase()} File`}</Typography>
            </Button>
        </React.Fragment>
    );
}
