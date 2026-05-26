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
// tslint:disable:jsx-no-multiline-js
import React from "react";
import { useStyles } from "./style";
import { Button, Codicon, Typography } from "@wso2/ui-toolkit";
import { FormattedMessage } from "react-intl";

interface FormHeaderSectionProps {
    formTitle: string;
    defaultMessage: string;
    formTitleSecond?: string;
    defaultMessageSecond?: string;
    formType?: string;
    onCancel?: () => void;
    onBack?: () => void;
}

export function FormHeaderSection(props: FormHeaderSectionProps) {
    const { onCancel, onBack, formTitle, formTitleSecond, defaultMessage, defaultMessageSecond } = props;
    const formClasses = useStyles();

    return (
        <div className={formClasses.formHeaderTitleWrapper}>
            {onBack && (
                <Button appearance="icon" onClick={onBack}>
                    <Codicon name="arrow-small-left" />
                </Button>
            )}
            <Typography variant="h4" sx={{ paddingTop: "19px", paddingBottom: "16px" }}>
                <FormattedMessage id={formTitle} defaultMessage={defaultMessage} />
            </Typography>
            {formTitleSecond && (
                <div className={formClasses.secondTitle}>
                    <Codicon name="chevron-right" />{" "}
                    <Typography variant="h4" sx={{ paddingTop: "19px", paddingBottom: "16px" }}>
                        <FormattedMessage id={formTitleSecond} defaultMessage={defaultMessageSecond} />
                    </Typography>{" "}
                </div>
            )}
            {onCancel && (
                <Button appearance="icon" onClick={onCancel}>
                    <Codicon name="close" />
                </Button>
            )}
        </div>
    );
}
