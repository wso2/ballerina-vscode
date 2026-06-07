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
import styled from "@emotion/styled";
import { css } from "@emotion/css";
import { ComponentPropsWithoutRef } from "react";

export const FormContainer: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
    flex-direction: column;
    width: inherit;
`;

export const FormWrapper: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    width: 100%;
    display: flex;
    flex-direction: column;
    padding: 15px 20px;
    gap: 8px;
`;

export const FormGroup: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const FormControlLabel: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
`;

export const InputWrapper: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`;

export const InputContainer: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
    flex-direction: column;
    width: 100%;
`

export const InputLabel: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
    flex-direction: row;
    color: var(--vscode-editor-foreground);
    font-size: 15;
    text-transform: capitalize;
    line-height: 35px;
    font-weight: 400;
    margin: 0;
    padding-left: 20px;
`;

export const InputLabelDetail: React.FC<ComponentPropsWithoutRef<"p">> = styled.p`
    color: var(--vscode-input-foreground);
    font-size: 13;
    text-transform: capitalize;
    font-weight: 300;
    padding-left: 20px;
`;

export const LabelWrapper: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    display: flex;
`;

export const RecordFormWrapper: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    width: 100%;
    max-height: 540;
    display: flex;
    flex-direction: row;
    padding: 15px 20px;
`;

export const RecordList: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    width: 100%;
    max-height: 540px;
    display: flex;
    flex-direction: column;
`;

export const FileSelect: React.FC<ComponentPropsWithoutRef<"div">> = styled.div`
    margin-left: auto;
    padding: 1.6px;
    & svg {
        margin: 5;
    }
    & svg:hover {
        -webkit-filter: drop-shadow(1px 1px 3px rgba(0, 0, 0, 0.3));
        filter: drop-shadow(1px 1px 3px rgba(0, 0, 0, 0.3));
    }
`;

export const useStyles = () => ({
    inputLabelForRequired: css({
        padding: 0,
        fontSize: 13,
        textTransform: "capitalize",
        display: "flex",
        alignItems: "center",
        fontWeight: 300,
        textWrap: "nowrap"
    }),
    optionalLabel: css({
        paddingRight: "5px",
        color: "var(--vscode-editorWidget-border)",
        fontSize: "12px",
        textTransform: "capitalize",
        display: "inline-block",
        lineHeight: "40px",
        marginBottom: "0.06rem",
        marginLeft: "0.25rem",
        marginTop: "0.094375rem",
    }),
    starLabelForRequired: css({
        padding: 0,
        color: "var(--vscode-errorForeground)",
        fontSize: "13px",
        textTransform: "capitalize",
        display: "inline-block",
    }),
    readOnlyEditor: css({
        width: 130,
        padding: 0,
        color: "var(--vscode-editor-foreground)",
        fontSize: 13,
        textTransform: "capitalize",
        display: "inline-block",
        lineHeight: "25px",
        fontWeight: 300,
    }),
    inputSuccessTick: css({
        color: "var(--vscode-debugIcon-restartForeground)",
        marginBottom: -5,
    }),
    recordOptions: css({
        paddingTop: 15,
        paddingLeft: 5,
        display: "inline-flex",
        alignItems: "center",
        "& a": {
            cursor: "pointer",
            color: "var(--vscode-gitDecoration-conflictingResourceForeground)",
        },
        "& a:hover": {
            textDecoration: "none",
        },
    }),
    deleteRecord: css({
        display: "flex",
        alignItems: "center",
        color: "var(--vscode-debugTokenExpression-error)",
        cursor: "pointer",
        "& svg": {
            marginRight: 8,
        },
    }),
    marginSpace: css({
        marginLeft: 15,
        marginRight: 15,
    }),
    undoButton: css({
        padding: 2,
    }),
    doneButtonWrapper: css({
        display: "flex",
        justifyContent: "flex-end",
        marginRight: 20,
        marginTop: 16,
    }),
    headerWrapper: css({
        background: "var(--vscode-editor-background)",
        padding: 10,
        borderRadius: 5,
        cursor: "pointer",
        border: "1px solid var(--vscode-editorRuler-foreground)",	
        marginTop: 15,
        marginLeft: 20,
        marginRight: 20,
        justifyContent: "space-between",
        display: "flex",
        flexDirection: "row",
        height: 40,
        alignItems: "center",
    }),
    contentSection: css({
        display: "flex",
        width: "75%",
        justifyContent: "flex-start",
    }),
    iconSection: css({
        display: "flex",
        flexDirection: "row",
        width: "25%",
        justifyContent: "flex-end",
    }),
});
