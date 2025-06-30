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
import { AsteriskToken, BitwiseAndToken, BitwiseXorToken, BooleanKeyword, CaptureBindingPattern, CheckAction, CheckExpression, DecimalFloatingPointLiteralToken, DecimalIntegerLiteralToken, DecimalKeyword, DoubleDotLtToken, DoubleEqualToken, DoubleGtToken, DoubleLtToken, EllipsisToken, ElvisToken, ExclamationMarkToken, FalseKeyword, FloatKeyword, GtEqualToken, GtToken, IdentifierToken, IntKeyword, JsonKeyword, ListBindingPattern, LogicalAndToken, LogicalOrToken, LtEqualToken, LtToken, MappingBindingPattern, MinusToken, NilLiteral, NotDoubleEqualToken, NotEqualToken, NullKeyword, PercentToken, PipeToken, PlusToken, SlashToken, STNode, StringKeyword, StringLiteral, StringLiteralToken, TemplateString, TrapExpression, TrippleEqualToken, TrippleGtToken, TrueKeyword, VarKeyword, Visitor } from "@wso2/syntax-tree";

import { isPositionsEquals } from "../utils";

class NextNodeSetupVisitor implements Visitor {
    private nextNode: STNode = null;
    private previousNode: STNode = null;
    private currentNode: STNode = null;
    private isCurrentNodeReached: boolean = false

    public beginVisitSTNode(node: STNode, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        }
    }

    public beginVisitCaptureBindingPattern(node: CaptureBindingPattern, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitListBindingPattern(node: ListBindingPattern, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitMappingBindingPattern(node: MappingBindingPattern, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitNilLiteral(node: NilLiteral, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitFalseKeyword(node: FalseKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitTrueKeyword(node: TrueKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitNullKeyword(node: NullKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDecimalFloatingPointLiteralToken(node: DecimalFloatingPointLiteralToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDecimalIntegerLiteralToken(node: DecimalIntegerLiteralToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitStringLiteralToken(node: StringLiteralToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitBooleanKeyword(node: BooleanKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDecimalKeyword(node: DecimalKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitFloatKeyword(node: FloatKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitIntKeyword(node: IntKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitJsonKeyword(node: JsonKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitStringKeyword(node: StringKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitVarKeyword(node: VarKeyword, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }
    public beginVisitIdentifierToken(node: IdentifierToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }
    public beginVisitTemplateString(node: TemplateString, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }
    public beginVisitAsteriskToken(node: AsteriskToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitBitwiseAndToken(node: BitwiseAndToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitBitwiseXorToken(node: BitwiseXorToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDoubleDotLtToken(node: DoubleDotLtToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDoubleEqualToken(node: DoubleEqualToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDoubleGtToken(node: DoubleGtToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitDoubleLtToken(node: DoubleLtToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitEllipsisToken(node: EllipsisToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitElvisToken(node: ElvisToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitGtEqualToken(node: GtEqualToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitGtToken(node: GtToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }


    public beginVisitLogicalAndToken(node: LogicalAndToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitLogicalOrToken(node: LogicalOrToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitLtEqualToken(node: LtEqualToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitExclamationMarkToken(node: ExclamationMarkToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitCheckExpression(node: CheckExpression, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitCheckAction(node: CheckAction, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitTrapExpression(node: TrapExpression, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitLtToken(node: LtToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitMinusToken(node: MinusToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitNotDoubleEqualToken(node: NotDoubleEqualToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitNotEqualToken(node: NotEqualToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitPercentToken(node: PercentToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }
    public beginVisitPipeToken(node: PipeToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }
    public beginVisitPlusToken(node: PlusToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitSlashToken(node: SlashToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    public beginVisitTrippleEqualToken(node: TrippleEqualToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }
    public beginVisitTrippleGtToken(node: TrippleGtToken, parent?: STNode) {
        if (this.currentNode && isPositionsEquals(this.currentNode.position, node.position)){
            this.isCurrentNodeReached = true;
        } else {
            if (!this.isCurrentNodeReached){
                this.previousNode = node;
            } else {
                if (!this.nextNode){
                    this.nextNode = node;
                }
            }
        }
    }

    setPropetiesDefault(): void {
        this.nextNode = null;
        this.previousNode = null;
        this.currentNode = null;
        this.isCurrentNodeReached = false;
    }

    setCurrentNode(currentNode: STNode){
        this.currentNode = currentNode
    }

    getPreviousNode(): STNode {

        return this.previousNode ? this.previousNode : this.currentNode;
    }

    getNextNode(): STNode {
        return this.nextNode ? this.nextNode : this.currentNode;
    }

}

export const nextNodeSetupVisitor = new NextNodeSetupVisitor();
