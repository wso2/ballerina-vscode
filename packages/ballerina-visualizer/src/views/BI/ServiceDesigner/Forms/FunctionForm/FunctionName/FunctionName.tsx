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

import React, { useState } from 'react';
import { TextField } from '@wso2/ui-toolkit';
import styled from '@emotion/styled';
import { PropertyModel } from '@wso2/ballerina-core';
import { ReadonlyField } from '../../../components/ReadonlyField';

const NameContainer = styled.div`
    display: flex;
	flex-direction: row;
`;

export interface FunctionNameProps {
	name: PropertyModel;
	onChange: (name: PropertyModel) => void;
	readonly?: boolean;
}

export function FunctionName(props: FunctionNameProps) {
	const { name, onChange, readonly } = props;

	const handleNameChange = (value: string) => {
		onChange({ ...name, value });
	};

	return (
		<>
			<NameContainer>
				{readonly && <ReadonlyField label="Function Name" name={name.value} />}
				{!readonly &&
					<TextField
						sx={{ flexGrow: 1 }}
						autoFocus
						errorMsg={""}
						label="Function Name"
						size={70}
						onChange={(e) => {
							const trimmedInput = e.target.value.trim();
							handleNameChange(trimmedInput);
						}}
						placeholder="foo"
						value={name.value}
						onFocus={(e) => e.target.select()}
					/>
				}
			</NameContainer>
		</>
	);
}
