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

import { Button, Icon } from "@wso2/ui-toolkit";
import { css } from "@emotion/css";

import { ImportType } from "./ImportDataForm";

const useStyles = () => ({
    importButton: css({
        "& > vscode-button": {
            width: "100%",
            height: "30px",
            margin: "10px 0px"
        }
    }),
});

const importTypes: ImportType[] = [
    { type: "JSON", label: "JSON" },
    { type: "JSONSCHEMA", label: "JSON Schema" },
    { type: "XML", label: "XML" },
    { type: "CSV", label: "CSV" }
];

interface ImportDataButtonsProps {
    onImportTypeChange: (importType: ImportType) => void;
}

export function ImportDataButtons(props: ImportDataButtonsProps) {
    const { onImportTypeChange } = props;
    const classes = useStyles();

    const handleImportTypeChange = (importType: ImportType) => {
        onImportTypeChange(importType);
    };

    const createImportButton = (importType: ImportType) => (
        <Button
            key={importType.type}
            appearance="primary"
            onClick={() => handleImportTypeChange(importType)}
            disabled={false}
            className={classes.importButton}
            sx={{ width: "100%" }}
        >
            <Icon
                sx={{ height: "18px", width: "18px", marginRight: "4px" }}
                iconSx={{ fontSize: "18px" }}
                name="import"
            />
            Import from {importType.label}
        </Button>
    );

    return (
        <>
            {importTypes.map(importType => createImportButton(importType))}
        </>
    );
}
