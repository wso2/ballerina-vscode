/* eslint-disable react-hooks/exhaustive-deps */
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

import React, { useEffect, useState } from 'react';
import { ActionButtons, Divider, SidePanelBody, Typography, ProgressIndicator, ThemeColors, Button, Icon } from '@wso2/ui-toolkit';
import { ResourcePath } from './ResourcePath/ResourcePath';
import { ResourceResponse } from './ResourceResponse/ResourceResponse';
import styled from '@emotion/styled';
import { HTTP_METHOD } from '../../utils';
import { FunctionModel, LogIcon, ParameterModel, PropertyModel, ReturnTypeModel } from '@wso2/ballerina-core';
import { verbs } from './ResourcePath/ResourcePath';
import { PanelContainer } from '@wso2/ballerina-side-panel';
import { getColorByMethod } from '../../../../../utils/utils';
import { Parameters } from './Parameters/Parameters';

const AdvancedParamTitleWrapper = styled.div`
	display: flex;
	flex-direction: row;
`;

namespace S {
	export const Container = styled.div<{}>`
        width: 100%;
    `;

	export const HeaderContainer = styled.div<{}>`
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 16px;
    `;

	export const PanelBody = styled(SidePanelBody)`
        height: calc(100vh - 100px);
        padding-top: 0;
    `;

	export const CategoryRow = styled.div<{ showBorder?: boolean }>`
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        width: 100%;
        margin-top: 0;
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    `;

	export const Row = styled.div<{}>`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
        margin-bottom: 4px;
        width: 100%;
    `;

	export const LeftAlignRow = styled(Row)`
        justify-content: flex-start;
    `;

	export const Grid = styled.div<{ columns: number }>`
        display: grid;
        grid-template-columns: repeat(${({ columns }: { columns: number }) => columns}, minmax(0, 1fr));
        gap: 8px;
        width: 100%;
        margin-top: 8px;
        margin-bottom: 12px;
    `;

	export const Title = styled.div<{}>`
        font-size: 14px;
        font-family: GilmerBold;
        white-space: nowrap;
        &:first {
            margin-top: 0;
        }
    `;

	export const SubTitle = styled.div<{}>`
        font-size: 12px;
        opacity: 0.9;
    `;

	export const BodyText = styled.div<{}>`
        font-size: 11px;
        opacity: 0.5;
    `;

	export const Component = styled.div<{ enabled?: boolean }>`
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
        padding: 5px;
        border: 1px solid ${ThemeColors.OUTLINE_VARIANT};
        border-radius: 5px;
        height: 36px;
        cursor: ${({ enabled }: { enabled?: boolean }) => (enabled ? "pointer" : "not-allowed")};
        font-size: 14px;
        min-width: 160px;
        max-width: 100%;
        ${({ enabled }: { enabled?: boolean }) => !enabled && "opacity: 0.5;"}
        &:hover {
            ${({ enabled }: { enabled?: boolean }) =>
			enabled &&
			`
                background-color: ${ThemeColors.PRIMARY_CONTAINER};
                border: 1px solid ${ThemeColors.HIGHLIGHT};
            `}
        }
    `;

	export const ComponentTitle = styled.div`
        white-space: nowrap;
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: block;
        word-break: break-word;
    `;

	export const IconContainer = styled.div`
        padding: 0 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        & svg {
            height: 16px;
            width: 16px;
        }
    `;

	export const HorizontalLine = styled.hr`
        width: 100%;
        border: 0;
        border-top: 1px solid ${ThemeColors.OUTLINE_VARIANT};
    `;

	export const BackButton = styled(Button)`
        /* position: absolute;
        right: 10px; */
        border-radius: 5px;
    `;

	export const CloseButton = styled(Button)`
        position: absolute;
        right: 10px;
        border-radius: 5px;
    `;

	export const HighlightedButton = styled.div`
        margin-top: 10px;
        margin-bottom: 12px;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 8px;
        padding: 6px 2px;
        color: ${ThemeColors.PRIMARY};
        border: 1px dashed ${ThemeColors.PRIMARY};
        border-radius: 5px;
        cursor: pointer;
        &:hover {
            border: 1px solid ${ThemeColors.PRIMARY};
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }
    `;

	export const AiContainer = styled.div`
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
        width: 100%;
        margin-top: 20px;
    `;

	export const AdvancedSubcategoryContainer = styled.div`
        display: flex;
        flex-direction: column;
        width: 100%;
        margin-top: 8px;
    `;

	export const AdvancedSubcategoryHeader = styled.div`
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 4px 12px;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
            background-color: ${ThemeColors.PRIMARY_CONTAINER};
        }

        &:hover > div:first-of-type {
            opacity: 1;
            color: ${ThemeColors.PRIMARY};
        }
    `;

	export const AdvancedSubTitle = styled.div`
        font-size: 12px;
        opacity: 0.7;
        color: ${ThemeColors.ON_SURFACE_VARIANT};
        transition: all 0.2s ease;
    `;


	export const CategorySeparator = styled.div`
        width: 100%;
        height: 1px;
        background-color: ${ThemeColors.OUTLINE_VARIANT};
        margin: 16px 0;
    `;
}

export interface NewResourceProps {
	model: FunctionModel;
	isSaving: boolean;
	onSave: (functionModel: FunctionModel) => void;
	onClose: () => void;
}

export function NewResource(props: NewResourceProps) {
	const { model, isSaving, onSave, onClose } = props;

	const [functionModel, setFunctionModel] = useState<FunctionModel>(model);
	const [isPathValid, setIsPathValid] = useState<boolean>(false);

	const [method, setMethod] = useState<string>("");


	const closeMethod = () => {
		setMethod("");
	}

	const setResourceMethod = (method: string) => {
		setMethod(method);
		const updatedFunctionModel = {
			...functionModel,
			accessor: { ...functionModel.accessor, value: method }
		};
		setFunctionModel(updatedFunctionModel);
	}

	useEffect(() => {
		console.log("New Resource Model", model);
	}, []);

	const onPathChange = (method: PropertyModel, path: PropertyModel) => {
		const updatedFunctionModel = {
			...functionModel,
			accessor: method,
			name: path,
		};
		setFunctionModel(updatedFunctionModel);
		console.log("Path,Method Change: ", updatedFunctionModel);
	}

	const onResourcePathError = (hasErros: boolean) => {
		setIsPathValid(!hasErros);
	}

	const handleParamChange = (params: ParameterModel[]) => {
		const updatedFunctionModel = {
			...functionModel,
			parameters: params
		};
		setFunctionModel(updatedFunctionModel);
		console.log("Parameter Change: ", updatedFunctionModel);
	};

	const handleResponseChange = (response: ReturnTypeModel) => {
		response.value = "";
		const updatedFunctionModel = {
			...functionModel,
			returnType: response
		};
		setFunctionModel(updatedFunctionModel);
		console.log("Response Change: ", updatedFunctionModel);
	};

	const handleSave = () => {
		console.log("Saved Resource", functionModel);
		onSave(functionModel);
	}

	return (
		<>
			{isSaving && <ProgressIndicator id="resource-loading-bar" />}
			<SidePanelBody>
				{/* Render HTTP Methods as components using S.Component and S.Grid */}
				<div style={{ marginBottom: "16px" }}>
					<div style={{ fontWeight: 500, fontSize: "14px", marginBottom: "8px" }}>HTTP Methods</div>
					<S.Grid columns={2}>
						{verbs.map((method: PropertyModel, idx: number) => (
							<S.Component
								key={method.value || idx}
								enabled={true}
								onClick={() => setResourceMethod(method.value)}
							>
								<S.IconContainer>{<Icon name='globe' isCodicon={true} />}</S.IconContainer>
								<S.ComponentTitle>
									{method.value}
								</S.ComponentTitle>
							</S.Component>
						))}
					</S.Grid>
				</div>
			</SidePanelBody>
			{/* This is for adding a http resource */}
			<PanelContainer
				title={`New Resource Configuration`}
				show={!!method}
				onClose={closeMethod}
				width={400}
			>
				<>
					{isSaving && <ProgressIndicator id="resource-loading-bar" />}
					<SidePanelBody>
						<Typography
							sx={{
								marginBlockEnd: 10,
								background: getColorByMethod(method.toUpperCase()),
								color: "#fff",
								padding: "6px 12px",
								borderRadius: "6px",
								display: "inline-block"
							}}
							variant="h4"
						>
							HTTP Method: <span style={{ fontWeight: 700 }}>{method}</span>
						</Typography>
						<Divider />
						<ResourcePath method={functionModel.accessor} path={functionModel.name} onChange={onPathChange} isNew={true}
							onError={onResourcePathError} />
						<Divider />
						<Parameters isNewResource={true} showPayload={(functionModel.accessor.value && functionModel.accessor.value.toUpperCase() !== "GET")} parameters={functionModel.parameters} onChange={handleParamChange} schemas={functionModel.schema} />
						<Typography sx={{ marginBlockEnd: 10 }} variant="h4">Responses</Typography>
						<ResourceResponse readonly={true} method={functionModel.accessor.value.toUpperCase() as HTTP_METHOD} response={functionModel.returnType} onChange={handleResponseChange} />
						<ActionButtons
							primaryButton={{ text: isSaving ? "Saving..." : "Save", onClick: handleSave, tooltip: isSaving ? "Saving..." : "Save", disabled: !isPathValid || isSaving, loading: isSaving }}
							secondaryButton={{ text: "Cancel", onClick: onClose, tooltip: "Cancel", disabled: isSaving }}
							sx={{ justifyContent: "flex-end" }}
						/>
					</SidePanelBody>
				</>
			</PanelContainer>
		</>
	);
}
