import { FieldAccess, OptionalFieldAccess, SimpleNameReference, STNode } from "@wso2/syntax-tree";

export class FieldAccessToSpecificFied {
	constructor(
		public fields: STNode[],
		public value: FieldAccess | OptionalFieldAccess | SimpleNameReference,
		public otherVal?: STNode
	){}
}
