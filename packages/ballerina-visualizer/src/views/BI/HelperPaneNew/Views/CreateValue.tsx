import { GetRecordConfigRequest, GetRecordConfigResponse, PropertyTypeMemberInfo, RecordSourceGenRequest, RecordSourceGenResponse, RecordTypeField, TypeField } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { useSlidingPane } from "@wso2/ui-toolkit/lib/components/ExpressionEditor/components/Common/SlidingPane/context";
import { useEffect, useRef, useState } from "react";
import { RecordConfig } from "./RecordConfigView";
import { CompletionItem } from "@wso2/ui-toolkit";
import { getDefaultValue, isRowType } from "../Utils/types";
import ExpandableList from "../Components/ExpandableList";
import SelectableItem from "../Components/SelectableItem";

type CreateValuePageProps = {
    fileName: string;
    currentValue: string;
    onChange: (value: string, isRecordConfigureChange: boolean) => void;
    selectedType?: CompletionItem;
    recordTypeField?: RecordTypeField;
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
    const { fileName, currentValue, onChange, selectedType, recordTypeField } = props;
    const [recordModel, setRecordModel] = useState<TypeField[]>([]);

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
        else{
            const tomValues = await rpcClient.getCommonRpcClient().getCurrentProjectTomlValues();
            return {
                filePath: fileName,
                codedata: {
                    org: tomValues.package.org,
                    module: tomValues.package.name,
                    version: tomValues.package.version,
                    packageName: propertyMember?.packageName,
                },
                typeConstraint: propertyMember?.type || selectedType.label,
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
        (isRowType(selectedType)) || recordTypeField ? <RecordConfig
            recordModel={recordModel}
            onModelChange={handleModelChange}
        /> : <NonRecordCreateValue
            fileName={fileName}
            currentValue={currentValue}
            onChange={onChange}
            selectedType={selectedType}
        />
    )
}

const NonRecordCreateValue = (props: CreateValuePageProps) => {
    const {  selectedType } = props;

    const handleValueSelect = (value: string) => {
        console.log("value", value)
    }

    const defaultValue = getDefaultValue(selectedType);
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
        </>
    );
}
