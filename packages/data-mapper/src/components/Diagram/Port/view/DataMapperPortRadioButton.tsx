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

import styled from "@emotion/styled";
import { Icon } from "@wso2/ui-toolkit";

export interface DataMapperPortRadioButtonProps {
	checked: boolean;
	disabled?: boolean;
}

function DataMapperPortRadioButton(props: DataMapperPortRadioButtonProps) {
	const { checked, disabled } = props;

	const iconSx = {
		display: "flex",
		fontSize: "15px"
	};

	if (disabled) {
		Object.assign(iconSx, {
			cursor: 'not-allowed',
			opacity: 0.5
		});
	}

	return (
		<Icon
			sx={{ height: "15px", width: "15px" }}
			iconSx={iconSx}
			name={checked ? "radio-button-checked" : "radio-button-unchecked"}
		/>
	);
}

export const RadioButtonChecked = styled(() => DataMapperPortRadioButton({ checked: true }))`
	user-select: none;
	pointer-events: auto;
`;

export const RadioButtonUnchecked = styled(({ disabled = false }) => DataMapperPortRadioButton({checked: false, disabled}))`
	user-select: none;
	pointer-events: auto;
`;
