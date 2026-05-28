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
import React, { useEffect, useMemo, useRef, useState } from "react";

import { Button, Icon, LinkButton, TextArea } from "@wso2/ui-toolkit";
import { css } from "@emotion/css";
import styled from "@emotion/styled";
import { Controller, useForm } from 'react-hook-form';

import { FileExtension, ImportType } from "./ImportDataForm";
import { validateCSV, validateJSON, validateXML } from "./ImportDataUtils";

const ErrorMessage = styled.span`
   color: var(--vscode-errorForeground);
   font-size: 12px;
`;

const useStyles = () => ({
    fileUploadText: css({
        fontSize: "12px"
    })
});

interface RowRange {
    start: number;
    offset: number;
}

interface ImportDataPanelProps {
    importType: ImportType;
    extension: FileExtension;
    rowRange?: RowRange;
    onSave: (text: string) => void;
}

export function ImportDataPanel(props: ImportDataPanelProps) {
    const { importType, extension, rowRange, onSave } = props;
    const classes = useStyles();
    const { clearErrors, control, formState: { errors }, setError, watch } = useForm();

    const [rows, setRows] = useState(rowRange.start || 1);
    const [fileContent, setFileContent] = useState("");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const hiddenFileInput = useRef(null);

    useEffect(() => {
        if (textAreaRef.current) {
            const textarea = textAreaRef.current.shadowRoot.querySelector("textarea");
            const handleOnKeyDown = (event: KeyboardEvent) => {
                if (event.key === "Tab") {
                    event.preventDefault();
                    const selectionStart = textarea.selectionStart;
                    textarea.setRangeText("  ", selectionStart, selectionStart, "end");
                }
            };

            textarea.addEventListener("keydown", handleOnKeyDown);
            return () => {
                textarea.removeEventListener("keydown", handleOnKeyDown);
            };
        }
    }, [textAreaRef]);

    useEffect(() => {
        if (!fileContent) return;
        try {
            switch (importType.type) {
                case 'JSON':
                    validateJSON(fileContent);
                    break;
                case 'CSV':
                    validateCSV(fileContent);
                    break;
                case 'XML':
                    validateXML(fileContent);
                    break;
                case 'JSONSCHEMA':
                    validateJSON(fileContent);
                    break;
                default:
                    break;
            }
            clearErrors("payload");
        } catch (error) {
            setError("payload", { message: `Invalid ${importType.label} format.` });
        }
    }, [fileContent, importType]);

    const growTextArea = (text: string) => {
        const { start, offset } = rowRange;
        const lineCount = text.split("\n").length;
        const newRows = Math.max(start, Math.min(start + offset, lineCount));
        setRows(newRows);
    };

    const handleChange = (e: any) => {
        if (rowRange) {
            growTextArea(e.target.value);
        }
        setFileContent(e.target.value);
    };

    const handleClick = (event?: React.MouseEvent<HTMLButtonElement>) => {
        hiddenFileInput.current.click();
    };

    const showFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        const reader = new FileReader();
        const ext = e.target.files[0].name.split(".").pop().toLowerCase();
        reader.readAsText(e.target.files[0]);
        reader.onload = async (loadEvent: any) => {
            if (`.${ext}` === extension) {
                const text = loadEvent.target.result as string;
                setFileContent(text);
            }
        };
    };

    const handleSave = () => {
        onSave(fileContent);
    };

    const generatePlaceholder = useMemo(() => {
        switch (importType.type) {
            case 'JSON':
                return '{"key":"value"}';
            case 'CSV':
                return 'column1,column2,column3';
            case 'XML':
                return '<root><element>value</element></root>';
            case 'JSONSCHEMA':
                return `Enter JSON Schema`;
            default:
                return 'Enter your data';
        }
    }, [importType]);

    const fileUploadText = useMemo(() => `Upload ${importType.label} file`, [importType]);

    return (
        <>
            <input hidden={true} accept={extension} type="file" onChange={showFile} ref={hiddenFileInput} />
            <LinkButton
                onClick={handleClick}
                sx={{ padding: "5px", gap: "2px"}}
            >
                <Icon
                    iconSx={{ fontSize: "12px" }}
                    name="file-upload"
                />
                    <p className={classes.fileUploadText}>{fileUploadText}</p>
            </LinkButton>
            <Controller
                name="payload"
                control={control}
                render={({ field }) => (
                    <TextArea
                        ref={textAreaRef}
                        onChange={handleChange}
                        rows={rows}
                        resize="vertical"
                        placeholder={generatePlaceholder}
                        value={fileContent}
                        sx={{border: "#00ff00"}}
                        errorMsg={errors && errors.payload?.message.toString()}
                    />
                )}
            />
            <div style={{ textAlign: "right", marginTop: "10px", float: "right" }}>
                <Button
                    appearance="primary"
                    onClick={handleSave}
                    disabled={false}
                >
                    Save
                </Button>
            </div>
        </>
    );
}
