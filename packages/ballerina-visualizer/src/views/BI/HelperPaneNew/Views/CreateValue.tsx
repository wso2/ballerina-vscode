import { GetRecordConfigRequest, GetRecordConfigResponse, PropertyTypeMemberInfo, RecordSourceGenRequest, RecordSourceGenResponse, RecordTypeField, TypeField } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useSlidingPane } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane/context";
import { RefObject, useEffect, useRef, useState } from "react";
import { RecordConfig } from "./RecordConfigView";
import { Button, CompletionItem } from "@wso2/ui-toolkit";
import { getDefaultValue, isRowType } from "../Utils/types";
import ExpandableList from "../Components/ExpandableList";
import SelectableItem from "../Components/SelectableItem";
import { SlidingPaneNavContainer } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane";
import DynamicModal from "../Components/Modal";
import FooterButtons from "../Components/FooterButtons";
import * as Types from "../Components/RecordConstructView/Types";
import { TypeProps } from "../../HelperView/ConfigurePanel";

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

    const handleModelChange = async (updatedModel: TypeField[]) => {
        const request: RecordSourceGenRequest = {
            filePath: fileName,
            type: updatedModel[0]
        }
        const recordSourceResponse: RecordSourceGenResponse = await rpcClient.getBIDiagramRpcClient().getRecordSource(request);
        console.log(">>> recordSourceResponse", recordSourceResponse);

        if (recordSourceResponse.recordValue !== undefined) {
            const content = recordSourceResponse.recordValue;
            sourceCode.current = content;
            onChange(content, true);
        }
    }
    useEffect(() => {
        fetchRecordModel()
    }, []);

    return (
        (isRowType(selectedType)) || recordTypeField ?
            <>

                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => setIsModalOpen(true)}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create value for the complex type
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
                <DynamicModal
                    width={500}
                    height={600}
                    anchorRef={anchorRef}
                    title="Create Value"
                    openState={isModalOpen}
                    setOpenState={setIsModalOpen}>
                    <RecordConfig
                        recordModel={recordModel}
                        onModelChange={handleModelChange}
                    />
                </DynamicModal>
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
    return selectedType === searchType;
}

const NonRecordCreateValue = (props: CreateValuePageProps) => {
    const { selectedType, onChange } = props;

    const handleValueSelect = (value: string) => {
        onChange(value, false);
    }

    const defaultValue = getDefaultValue(Array.isArray(selectedType) ? selectedType[0] : selectedType);
    return (
        <>
            {defaultValue && (
                <ExpandableList>
                    <SelectableItem onClick={() => { handleValueSelect(defaultValue) }} className="selectable-list-item">
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            {defaultValue}
                        </ExpandableList.Item>
                    </SelectableItem>
                </ExpandableList>
            )}
            {isSelectedTypeContainsType(selectedType, "string") && (
                <ExpandableList>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("string ``") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create a string template
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                    <SlidingPaneNavContainer onClick={() => { handleValueSelect("\"\"") }}>
                        <ExpandableList.Item sx={{ width: "100%" }}>
                            Create a string value
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            )}
        </>
    );
}