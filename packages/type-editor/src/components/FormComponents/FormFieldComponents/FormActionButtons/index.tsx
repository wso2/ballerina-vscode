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
// tslint:disable: jsx-no-multiline-js
import * as React from "react";
import { useStyles } from "./style";
import { Switch } from "@headlessui/react";
import { FormGroup } from "../../../../style";
import { Button, Typography } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

export interface FormActionButtonsProps {
    cancelBtnText?: string;
    saveBtnText?: string;
    isMutationInProgress?: boolean;
    validForm?: boolean;
    onSave?: () => void;
    onCancel?: () => void;
    statementEditor?: boolean;
    toggleChecked?: boolean;
    experimentalEnabled?: boolean;
}

export function FormActionButtons(props: FormActionButtonsProps) {
    const classes = useStyles();
    const {
        cancelBtnText,
        saveBtnText,
        isMutationInProgress,
        validForm,
        onSave,
        onCancel,
        statementEditor,
        toggleChecked,
        experimentalEnabled,
    } = props;
    return (
        <div className={classes.formSave}>
            <div className={classes.stmtEditorToggle}>
                {experimentalEnabled && statementEditor && (
                    <FormGroup>
                        <Switch checked={toggleChecked} />
                    </FormGroup>
                )}
            </div>
            <div className={classes.buttonWrapper}>
                <Button appearance="secondary" onClick={() => onCancel()}>
                    <ButtonText variant="h4">{cancelBtnText}</ButtonText>
                </Button>
                <Button
                    appearance="primary"
                    disabled={isMutationInProgress || !validForm}
                    onClick={onSave}
                    data-testid="save-btn"
                >
                    <ButtonText variant="h4">{saveBtnText}</ButtonText>
                </Button>
            </div>
        </div>
    );
}

const ButtonText = styled(Typography)`
    margin: 0;
    padding: 0;
`;

