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

import { GetRecordConfigResponse, PropertyTypeMemberInfo, RecordTypeField, TypeField } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { RefObject, useEffect, useRef, useState } from "react";
import { getDefaultValue, isRowType } from "../Utils/types";
import ExpandableList from "../Components/ExpandableList";
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane";

type CreateValuePageProps = {
    fileName: string;
    currentValue: string;
    onChange: (value: string, isRecordConfigureChange: boolean) => void;
    selectedType?: string | string[];
    recordTypeField?: RecordTypeField;
    anchorRef: RefObject<HTMLDivElement>;
}

const passPackageInfoIfExists = (recordTypeMember: PropertyTypeMemberInfo) => {
    let org = "";
    let module = "";
    let version = "";
    if (recordTypeMember?.packageInfo) {
        const parts = recordTypeMember?.packageInfo.split(':');
        if (parts.length === 3) {
            [org, module, version] = parts;
        }
    }
    return { org, module, version }
}

const getPropertyMember = (field: RecordTypeField) => {
    return field?.recordTypeMembers.at(0);
}

export const CreateValue = (props: CreateValuePageProps) => {
    const { fileName, currentValue, onChange, selectedType, recordTypeField, anchorRef } = props;
    const [recordModel, setRecordModel] = useState<TypeField[]>([]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const { rpcClient } = useRpcContext();
    const propertyMember = getPropertyMember(recordTypeField)

    const sourceCode = useRef<string>(currentValue);

    const getRecordConfigRequest = async () => {
        if (recordTypeField) {
            const packageInfo = passPackageInfoIfExists(recordTypeField?.recordTypeMembers.at(0))
            return {
                filePath: fileName,
                codedata: {
                    org: packageInfo.org,
                    module: packageInfo.module,
                    version: packageInfo.version,
                    packageName: propertyMember?.packageName,
                },
                typeConstraint: propertyMember?.type,
            }
        }
        else {
            const tomValues = await rpcClient.getCommonRpcClient().getCurrentProjectTomlValues();
            return {
                filePath: fileName,
                codedata: {
                    org: tomValues.package.org,
                    module: tomValues.package.name,
                    version: tomValues.package.version,
                    packageName: propertyMember?.packageName,
                },
                typeConstraint: propertyMember?.type || Array.isArray(selectedType) ? selectedType[0] : selectedType,
            }
        }
    }

    const fetchRecordModel = async () => {
        const request = await getRecordConfigRequest();
        const typeFieldResponse: GetRecordConfigResponse = await rpcClient.getBIDiagramRpcClient().getRecordConfig(request);
        if (typeFieldResponse.recordConfig) {
            const recordConfig: TypeField = {
                name: propertyMember?.type,
                ...typeFieldResponse.recordConfig
            }

            setRecordModel([recordConfig]);
        }
    }

    useEffect(() => {
        fetchRecordModel()
    }, []);

    return (
        (recordTypeField) ?
            <>
            </>
            : <NonRecordCreateValue
                fileName={fileName}
                currentValue={currentValue}
                onChange={onChange}
                selectedType={selectedType}
                {...props}
            />
    )
}

const isSelectedTypeContainsType = (selectedType: string | string[], searchType: string) => {
    if (Array.isArray(selectedType)) {
        return selectedType.some(type => type.includes(searchType));
    }
    const unionTypes = selectedType.split("|").map(type => type.trim());
    return unionTypes.includes(searchType);
}

const NonRecordCreateValue = (props: CreateValuePageProps) => {
    const { selectedType, onChange } = props;

    const handleValueSelect = (value: string) => {
        onChange(value, false);
    }

    const defaultValue = getDefaultValue(Array.isArray(selectedType) ? selectedType[0] : selectedType);
    return (
        <div style={{ padding: '8px 0px' }}>
            {defaultValue && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect(defaultValue) }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Initialize to {defaultValue}
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "string") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("\"TEXT_HERE\"") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create a string value
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "log:PrintableRawTemplate") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("string `TEXT_HERE`") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create a printable template
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "error") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("error(\"ERROR_MESSAGE_HERE\")") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create an error
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "json") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("{}") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create an empty json
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "xml") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("xml ``") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create a xml
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "anydata") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("{}") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create an empty object
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
        </div>
    );
}
