/*
 * Copyright (c) 2023, WSO2 LLC. (http://www.wso2.com). All Rights Reserved.
 *
 * This software is the property of WSO2 LLC. and its suppliers, if any.
 * Dissemination of any information or reproduction of any material contained
 * herein is strictly forbidden, unless permitted by WSO2 in accordance with
 * the WSO2 Commercial License available at http://wso2.com/licenses.
 * For specific language governing the permissions and limitations under
 * this license, please see the license as well as any agreement you’ve
 * entered into with WSO2 governing the purchase of this software and any
 * associated services.
 */
import { Point } from "@projectstorm/geometry";
import { STModification, TypeField, PrimitiveBalType } from "@wso2/ballerina-core";
import {
    ExpressionFunctionBody,
    IdentifierToken,
    NodePosition,
    SelectClause,
    STKindChecker,
    STNode,
    traversNode,
} from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { ExpressionLabelModel } from "../../Label";
import { DataMapperLinkModel } from "../../Link";
import { EditableRecordField } from "../../Mappings/EditableRecordField";
import { FieldAccessToSpecificFied } from "../../Mappings/FieldAccessToSpecificFied";
import { RecordFieldPortModel } from "../../Port";
import {
    LIST_CONSTRUCTOR_TARGET_PORT_PREFIX,
    MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX,
    PRIMITIVE_TYPE_TARGET_PORT_PREFIX,
    UNION_TYPE_TARGET_PORT_PREFIX
} from "../../utils/constants";
import {
    getBalRecFieldName,
    getDefaultValue,
    getExprBodyFromLetExpression,
    getInnermostExpressionBody,
    getInputNodeExpr,
    getInputPortsForExpr,
    getOutputPortForField,
    getSearchFilteredOutput,
    getTypeFromStore,
    getTypeName,
    getTypeOfValue,
    isArrayOrRecord
} from "../../utils/dm-utils";
import { filterDiagnostics } from "../../utils/ls-utils";
import { enrichAndProcessType } from "../../utils/type-utils";
import { getResolvedType, getSupportedUnionTypes, getUnionTypes, isAnydataType } from "../../utils/union-type-utils";
import { LinkDeletingVisitor } from "../../visitors/LinkDeletingVistior";
import { DataMapperNodeModel, TypeDescriptor } from "../commons/DataMapperNode";

export const UNION_TYPE_NODE_TYPE = "data-mapper-node-union-type";
const NODE_ID = "union-type-node";

export class UnionTypeNode extends DataMapperNodeModel {

    public recordField: EditableRecordField;
    public typeName: string;
    public rootName: string;
    public resolvedType: TypeField;
    public hasInvalidTypeCast: boolean;
    public mappings: FieldAccessToSpecificFied[];
    public unionTypeDef: TypeField;
    public unionTypes: string[];
    public innermostExpr: STNode;
    public typeCastExpr: STNode;
    public x: number;
    public y: number;

    constructor(
        public context: IDataMapperContext,
        public value: ExpressionFunctionBody | SelectClause,
        public typeIdentifier: TypeDescriptor | IdentifierToken,
        public typeDef: TypeField
    ) {
        super(
            NODE_ID,
            context,
            UNION_TYPE_NODE_TYPE
        );
        this.innermostExpr = getInnermostExpressionBody(this.value.expression);
        this.typeCastExpr = this.getTypeCastExpr();
        this.unionTypeDef = this.typeDef.typeName === PrimitiveBalType.Union
            ? this.typeDef
            : this.typeDef.typeName === PrimitiveBalType.Array && this.typeDef.memberType.typeName === PrimitiveBalType.Union
                ? this.typeDef.memberType
                : undefined;
        this.unionTypes = this.unionTypeDef && getUnionTypes(this.unionTypeDef);
    }

    async initPorts() {
        this.typeName = getTypeName(this.typeDef);
        this.resolveType();
        const renderResolvedTypes = !this.shouldRenderUnionType();
        const isSelectClause = STKindChecker.isSelectClause(this.innermostExpr);
        if (this.resolvedType && renderResolvedTypes) {
            this.typeDef = getSearchFilteredOutput(this.resolvedType);
            if (this.typeDef) {
                this.rootName = this.typeDef?.name
                    ? getBalRecFieldName(this.typeDef.name)
                    : this.resolvedType.typeName === PrimitiveBalType.Array
                        ? this.typeDef.typeName
                        : undefined;
                if (isSelectClause
                    && this.typeDef.typeName === PrimitiveBalType.Array
                    && this.typeDef?.memberType)
                {
                    this.rootName = this.typeDef.memberType.typeName === PrimitiveBalType.Record
                        ? this.typeDef.memberType?.name
                        : this.typeIdentifier.value || this.typeIdentifier.source;
                }
                const [valueEnrichedType, type] = enrichAndProcessType(this.typeDef, this.innermostExpr,
                    this.context.selection.selectedST.stNode);
                this.typeDef = type;
                this.addPorts(valueEnrichedType, isSelectClause);
            }
        } else {
            this.rootName = undefined;
            this.addPortsForHeaderField(this.typeDef, this.rootName, "IN", UNION_TYPE_TARGET_PORT_PREFIX, [], isSelectClause);
        }
    }

    initLinks(): void {
        this.mappings = this.genMappings(this.value.expression);
        this.createLinks(this.mappings);
    }

    private createLinks(mappings: FieldAccessToSpecificFied[]) {
        mappings.forEach((mapping) => {
            const { fields, value, otherVal } = mapping;
            const field = fields[fields.length - 1];
            if (!value || !value.source) {
                // Unsupported mapping
                return;
            }
            const inputNode = getInputNodeExpr(value, this);
            let inPort: RecordFieldPortModel;
            if (inputNode) {
                inPort = getInputPortsForExpr(inputNode, value);
            }
            const [outPort, mappedOutPort] = this.getOutPort(fields);
            const diagnosticsPosition = (this.shouldRenderUnionType()
                ? this.resolvedType && this.typeCastExpr
                    ? this.typeCastExpr.position
                    : this.innermostExpr.position
                : otherVal.position || value.position) as NodePosition;
            const diagnostics = filterDiagnostics(this.context.diagnostics, diagnosticsPosition);
            const lm = new DataMapperLinkModel(value, diagnostics, true);
            if (inPort && mappedOutPort) {
                let keepDefault = this.resolvedType && this.resolvedType.typeName === PrimitiveBalType.Array;
                if (this.resolvedType && this.resolvedType.typeName === PrimitiveBalType.Record) {
                    const mappedField = mappedOutPort.editableRecordField && mappedOutPort.editableRecordField.type;
                    keepDefault = ((mappedField && !mappedField?.name
                            && mappedField.typeName !== PrimitiveBalType.Array
                            && mappedField.typeName !== PrimitiveBalType.Record)
                        || !STKindChecker.isMappingConstructor(this.value.expression)
                    );
                }
                lm.addLabel(new ExpressionLabelModel({
                    value: otherVal?.source || value.source,
                    valueNode: otherVal || value,
                    context: this.context,
                    link: lm,
                    field: STKindChecker.isSpecificField(field)
                        ? field.valueExpr
                        : field,
                    editorLabel: STKindChecker.isSpecificField(field)
                        ? field.fieldName.value as string
                        : `${outPort.fieldFQN.split('.').pop()}[${outPort.index}]`,
                    deleteLink: () => this.deleteField(field, keepDefault)
                }));
                lm.setTargetPort(mappedOutPort);
                lm.setSourcePort(inPort);
                inPort.addLinkedPort(mappedOutPort);
                lm.registerListener({
                    selectionChanged(event) {
                        if (event.isSelected) {
                            inPort.fireEvent({}, "link-selected");
                            mappedOutPort.fireEvent({}, "link-selected");
                        } else {
                            inPort.fireEvent({}, "link-unselected");
                            mappedOutPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(lm);
            }
        });
    }

    private resolveType() {
        const bodyExpr = STKindChecker.isLetExpression(this.value.expression)
            ? getExprBodyFromLetExpression(this.value.expression)
            : this.value.expression;
        const supportedTypes = getSupportedUnionTypes(this.unionTypeDef, this.typeIdentifier);
        if (STKindChecker.isTypeCastExpression(bodyExpr)) {
            // when the expr is wrapped with a type cast
            const type = bodyExpr.typeCastParam?.type;
            this.resolvedType = this.unionTypeDef.members.find((member) => {
                return getResolvedType(member, type);
            });
            this.hasInvalidTypeCast = !this.resolvedType;
        } else if (supportedTypes.length === 1) {
            // when the specified union type is narrowed down to a single type
            this.resolvedType = this.unionTypeDef.members.find(member => {
                const typeName = getTypeName(member);
                return typeName === supportedTypes[0];
            });
        } else {
            // when the type is derivable from the expr
            const typeFromStore = getTypeFromStore(this.innermostExpr.position as NodePosition);
            const typeName = getTypeName(typeFromStore);
            this.resolvedType = !!typeFromStore
                && typeFromStore.typeName !== '$CompilationError$'
                && supportedTypes.includes(typeName)
                && typeFromStore;
            if (!!typeFromStore && !this.resolvedType) {
                if (supportedTypes.includes("anydata") || supportedTypes.includes("any")) {
                    this.resolvedType = this.unionTypeDef.members.find((member) => {
                        return isAnydataType(member.typeName);
                    });
                }
            }
        }
    }

    private addPorts(valueEnrichedType: EditableRecordField, isSelectClause: boolean) {
        switch (this.resolvedType.typeName) {
            case PrimitiveBalType.Record:
                this.addPortsForMappingConstructor(valueEnrichedType, isSelectClause);
                break;
            case PrimitiveBalType.Array:
                this.addPortsForListConstructor(valueEnrichedType, isSelectClause);
                break;
            default:
                this.addPortsForPrimitiveType(valueEnrichedType);
                break;
        }
    }

    private addPortsForMappingConstructor(valueEnrichedType: EditableRecordField, isSelectClause: boolean) {
        const parentPort = this.addPortsForHeaderField(this.typeDef, this.rootName, "IN",
            MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX, this.context.collapsedFields,
            isSelectClause, valueEnrichedType);
        if (valueEnrichedType.type.typeName === PrimitiveBalType.Record) {
            this.recordField = valueEnrichedType;
            if (this.recordField.childrenTypes.length) {
                this.recordField.childrenTypes.forEach((field) => {
                    this.addPortsForOutputRecordField(field, "IN", this.rootName, undefined,
                        MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX, parentPort,
                        this.context.collapsedFields, parentPort.collapsed);
                });
            }
        } else if (valueEnrichedType.type.typeName === PrimitiveBalType.Array && isSelectClause) {
            // valueEnrichedType only contains a single element as it is being used within the select clause in the query expression
            this.recordField = valueEnrichedType.elements[0].member;
            if (this.recordField.childrenTypes.length) {
                this.recordField.childrenTypes.forEach((field) => {
                    this.addPortsForOutputRecordField(field, "IN", this.rootName, undefined,
                        MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX, parentPort,
                        this.context.collapsedFields, parentPort.collapsed, true);
                });
            }
        }
    }

    private addPortsForListConstructor(valueEnrichedType: EditableRecordField, isSelectClause: boolean) {
        this.recordField = valueEnrichedType;
        const parentPort = this.addPortsForHeaderField(this.typeDef, this.rootName, "IN",
            LIST_CONSTRUCTOR_TARGET_PORT_PREFIX, this.context.collapsedFields, isSelectClause, this.recordField);
        if (valueEnrichedType.type.typeName === PrimitiveBalType.Array) {
            if (isSelectClause) {
                this.recordField = valueEnrichedType.elements[0].member;
            }
            if (this.recordField?.elements && this.recordField.elements.length > 0) {
                this.recordField.elements.forEach((field, index) => {
                    this.addPortsForOutputRecordField(field.member, "IN", this.rootName, index,
                        LIST_CONSTRUCTOR_TARGET_PORT_PREFIX, parentPort,
                        this.context.collapsedFields, parentPort.collapsed);
                });
            }
        }
    }

    private addPortsForPrimitiveType(valueEnrichedType: EditableRecordField) {
        this.recordField = valueEnrichedType;
        if (valueEnrichedType.type.typeName === PrimitiveBalType.Array
            && STKindChecker.isSelectClause(this.value)
        ) {
            this.recordField = valueEnrichedType.elements[0].member;
        }
        const parentPort = this.addPortsForHeaderField(this.typeDef, '', "IN",
            PRIMITIVE_TYPE_TARGET_PORT_PREFIX, this.context.collapsedFields,
            STKindChecker.isSelectClause(this.value), this.recordField);
        this.addPortsForOutputRecordField(this.recordField, "IN", this.recordField.type.typeName,
            undefined, PRIMITIVE_TYPE_TARGET_PORT_PREFIX, parentPort,
            this.context.collapsedFields, parentPort.collapsed, STKindChecker.isSelectClause(this.value));
    }

    private getOutPort(fields: STNode[]): [RecordFieldPortModel, RecordFieldPortModel] {
        if (this.shouldRenderUnionType()) {
            return this.getOutPortForUnionType();
        }
        switch (this.resolvedType.typeName) {
            case PrimitiveBalType.Record:
                return this.getOutPortForMappingConstructor(fields);
            case PrimitiveBalType.Array:
                return this.getOutPortForListConstructor(fields);
            default:
                return this.getOutPortForPrimitiveType(fields);
        }
    }

    private getOutPortForMappingConstructor(fields: STNode[]): [RecordFieldPortModel, RecordFieldPortModel] {
        return getOutputPortForField(fields,
            this.recordField,
            MAPPING_CONSTRUCTOR_TARGET_PORT_PREFIX,
            (portId: string) =>  this.getPort(portId) as RecordFieldPortModel)
    }

    private getOutPortForListConstructor(fields: STNode[]): [RecordFieldPortModel, RecordFieldPortModel] {
        let outPort: RecordFieldPortModel;
        let mappedOutPort: RecordFieldPortModel;
        const body = getInnermostExpressionBody(this.recordField.value);
        if (this.recordField.type.typeName === PrimitiveBalType.Array
            && this.recordField?.value
            && !STKindChecker.isListConstructor(body)
        ) {
            outPort = this.getPort(`${LIST_CONSTRUCTOR_TARGET_PORT_PREFIX}.${this.rootName}.IN`) as RecordFieldPortModel;
            mappedOutPort = outPort;
        } else {
            [outPort, mappedOutPort] = getOutputPortForField(fields,
                this.recordField,
                LIST_CONSTRUCTOR_TARGET_PORT_PREFIX,
                (portId: string) =>  this.getPort(portId) as RecordFieldPortModel,
                this.rootName);
        }
        return [outPort, mappedOutPort];
    }

    private getOutPortForPrimitiveType(fields: STNode[]): [RecordFieldPortModel, RecordFieldPortModel] {
        let outPort: RecordFieldPortModel;
        let mappedOutPort: RecordFieldPortModel;
        if (!isArrayOrRecord(this.recordField.type)) {
            outPort = this.getPort(`${PRIMITIVE_TYPE_TARGET_PORT_PREFIX}.${
                this.recordField.type.typeName}.IN`) as RecordFieldPortModel;
            mappedOutPort = outPort;
        } else {
            [outPort, mappedOutPort] = getOutputPortForField(fields,
                this.recordField,
                PRIMITIVE_TYPE_TARGET_PORT_PREFIX,
                (portId: string) =>  this.getPort(portId) as RecordFieldPortModel);
        }
        return [outPort, mappedOutPort];
    }

    private getOutPortForUnionType(): [RecordFieldPortModel, RecordFieldPortModel] {
        const outPort = this.getPort(`${UNION_TYPE_TARGET_PORT_PREFIX}.IN`) as RecordFieldPortModel;
        return [outPort, outPort];
    }

    public shouldRenderUnionType() {
        return !this.resolvedType
            || !STKindChecker.isMappingConstructor(this.innermostExpr) && this.resolvedType.typeName === PrimitiveBalType.Record
            || !STKindChecker.isListConstructor(this.innermostExpr) && this.resolvedType.typeName === PrimitiveBalType.Array;
    }

    public getTypeCastExpr(): STNode {
        let valueExpr: STNode = this.value.expression;
        if (STKindChecker.isLetExpression(valueExpr)) {
            valueExpr = getExprBodyFromLetExpression(valueExpr);
        }
        return STKindChecker.isTypeCastExpression(valueExpr) ? valueExpr : undefined;
    }

    async deleteField(field: STNode, keepDefault?: boolean) {
        if (this.shouldRenderUnionType()) {
            await this.deleteLinkForUnionType(field);
        }
        switch (this.resolvedType.typeName) {
            case PrimitiveBalType.Record:
                await this.deleteLinkForMappingConstructor(field, keepDefault);
                break;
            case PrimitiveBalType.Array:
                await this.deleteLinkForListConstructor(field, keepDefault);
                break;
            default:
                await this.deleteLinkForPrimitiveType(field);
        }
    }

    async deleteLinkForMappingConstructor(field: STNode, keepDefault?: boolean) {
        let modifications: STModification[];
        const typeOfValue = getTypeOfValue(this.recordField, field.position);
        if (keepDefault && !STKindChecker.isSpecificField(field)) {
            modifications = [{
                type: "INSERT",
                config: {
                    "STATEMENT": getDefaultValue(typeOfValue?.typeName)
                },
                ...field.position
            }];
        } else if (STKindChecker.isSelectClause(this.value) && STKindChecker.isSpecificField(field)) {
            // if Within query expression expanded view
            modifications = [{
                type: "DELETE",
                ...field.valueExpr?.position
            }];
        } else {
            const linkDeleteVisitor = new LinkDeletingVisitor(field.position as NodePosition, this.innermostExpr);
            traversNode(this.value.expression, linkDeleteVisitor);
            const nodePositionsToDelete = linkDeleteVisitor.getPositionToDelete();
            modifications = [{
                type: "DELETE",
                ...nodePositionsToDelete
            }];
        }

        await this.context.applyModifications(modifications);
    }

    async deleteLinkForListConstructor(field: STNode, keepDefault?: boolean) {
        let modifications: STModification[];
        const typeOfValue = getTypeOfValue(this.recordField, field.position);
        if (keepDefault && !STKindChecker.isSpecificField(field)) {
            modifications = [{
                type: "INSERT",
                config: {
                    "STATEMENT": getDefaultValue(typeOfValue?.typeName)
                },
                ...field.position
            }];
        } else {
            const linkDeleteVisitor = new LinkDeletingVisitor(field.position, this.innermostExpr);
            traversNode(this.innermostExpr, linkDeleteVisitor);
            const nodePositionsToDelete = linkDeleteVisitor.getPositionToDelete();
            modifications = [{
                type: "DELETE",
                ...nodePositionsToDelete
            }]
        }

        await this.context.applyModifications(modifications);
    }

    async deleteLinkForPrimitiveType(field: STNode) {
        const typeOfValue = STKindChecker.isSelectClause(this.value) && this.typeDef?.memberType
            ? this.typeDef.memberType
            : this.typeDef;
        const modifications: STModification[] = [{
            type: "INSERT",
            config: {
                "STATEMENT": getDefaultValue(typeOfValue?.typeName)
            },
            ...field.position
        }];

        await this.context.applyModifications(modifications);
    }

    async deleteLinkForUnionType(field: STNode) {
        const modifications: STModification[] = [{
            type: "INSERT",
            config: {
                "STATEMENT": ''
            },
            ...field.position
        }];

        await this.context.applyModifications(modifications);
    }

    public updatePosition() {
        this.setPosition(this.position.x, this.position.y);
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number') {
            if (!this.x || !this.y) {
                this.x = x;
                this.y = y;
            }
            super.setPosition(x, y);
        }
    }
}
