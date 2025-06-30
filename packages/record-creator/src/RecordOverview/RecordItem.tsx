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
import React from "react";
import { RecordItemModel } from "../types";
import { CheckBoxGroup } from "../components/FormComponents/FormFieldComponents/CheckBox";
import { Button, Codicon } from "@wso2/ui-toolkit";
import { useStyles } from "../style";

interface ParamItemProps {
    record: RecordItemModel;
    onEditClick: (param: string) => void;
    handleOnCheck: () => void;
}

export function RecordItem(props: ParamItemProps) {
    const classes = useStyles();
    const { record, onEditClick, handleOnCheck } = props;

    const handleEdit = () => {
        onEditClick(record.name);
    };

    const handleCheckboxClick = (list: string[]) => {
        record.checked = list.length > 0;
        handleOnCheck();
    };

    return (
        <div className={classes.headerWrapper} data-testid={`${record.name}-item`}>
            <div className={classes.contentSection}>
                <CheckBoxGroup
                    values={[record.name]}
                    defaultValues={record.checked ? [record.name] : []}
                    onChange={handleCheckboxClick}
                />
            </div>
            <div className={classes.iconSection}>
                <Button appearance="icon" onClick={handleEdit} sx={{ height: "14px", width: "14px", marginRight: "5px" }}>
                    <Codicon name="edit" />
                </Button>
            </div>
        </div>
    );
}
