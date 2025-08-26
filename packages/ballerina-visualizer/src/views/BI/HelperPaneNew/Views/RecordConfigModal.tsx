import { GetRecordConfigResponse, PropertyTypeMemberInfo, RecordTypeField, TypeField } from "@wso2/ballerina-core";
import { useEffect, useState } from "react";
import { RecordConfig } from "./RecordConfigView";
import { useRpcContext } from "@wso2/ballerina-rpc-client/lib/context/ballerina-web-context";

const getPropertyMember = (field: RecordTypeField) => {
    return field?.recordTypeMembers.at(0);
}

type RecordConfigModalProps = {
    recordTypeField: RecordTypeField;
    fileName: string;
    handleModalChange: (updatedModel: TypeField[])=>void;
    valueTypeConstraint: string | string[];
};

export const RecordConfigModal = (props: RecordConfigModalProps) => {
    const { recordTypeField, fileName , handleModalChange, valueTypeConstraint} = props;
    const [recordModel, setRecordModel] = useState<TypeField[]>([]);

    const propertyMember = getPropertyMember(recordTypeField)

    const { rpcClient } = useRpcContext();

    useEffect(() => {
        fetchRecordModel()
    }, []);


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
                typeConstraint: propertyMember?.type || Array.isArray(valueTypeConstraint) ? valueTypeConstraint[0] : valueTypeConstraint,
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
    return (
        <RecordConfig
            recordModel={recordModel}
            onModelChange={handleModalChange}
        />
    );
};
