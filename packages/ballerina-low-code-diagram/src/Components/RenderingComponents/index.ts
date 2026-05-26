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
import { ClassComponent } from './ClassComponent';
import { Constant } from './Constant';
import { DoStatement } from './DoStatement';
import { End } from "./End";
import { EnumDeclarationComponent } from './Enum';
import { ForEach } from './ForEach';
import { Function } from "./Function";
import { IfElse } from './IfElse';
import { Listener } from './Listener';
import { ModulePartComponent } from "./ModulePart";
import { ModuleVariable } from './ModuleVariable';
import { RecordDefinitionComponent } from "./RecordDefinion";
import { Return } from './Return';
import { Service } from "./Service";
import { Statement } from "./Statement";
import { TypeDefinitionComponent } from './TypeDefinition';
import { While } from './While';
import { Worker } from './WorkerDeclaration';

export { IfElse as IfElseStatement };
export { ForEach as ForeachStatement };
export { Statement as LocalVarDecl };
export { Statement as CallStatement };
export { Statement as ActionStatement };
export { Statement as AssignmentStatement }
export { Listener as ListenerDeclaration };
export { Constant as ConstDeclaration };
export { ModuleVariable as ModuleVarDecl };
export { ModuleVariable as ObjectField };
export { TypeDefinitionComponent as TypeDefinition };
export { Return as ReturnStatement };
export { Function as FunctionDefinition };
export { Function as ResourceAccessorDefinition };
export { Function as ObjectMethodDefinition };
export { ModulePartComponent as ModulePart };
export { While as WhileStatement };
export { ClassComponent as ClassDefinition };
export { EnumDeclarationComponent as EnumDeclaration };
export { Worker as NamedWorkerDeclaration };
export { DoStatement as DoStatement };
