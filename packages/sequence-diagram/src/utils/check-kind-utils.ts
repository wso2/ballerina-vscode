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

import { DiagramElement, ParticipantType, Participant, NodeKind, InteractionType, Node, NodeBranch } from "./types";

export class DiagramElementKindChecker {
    static isParticipant(element: DiagramElement): element is Participant {
        return element.kind === ParticipantType.ENDPOINT || element.kind === ParticipantType.FUNCTION;
    }

    static isEndpoint(element: DiagramElement): element is Node {
        return element.kind === ParticipantType.ENDPOINT;
    }

    static isFunction(element: DiagramElement): element is Node {
        return element.kind === ParticipantType.FUNCTION;
    }

    static isNode(element: DiagramElement): element is Node {
        return element.kind === NodeKind.INTERACTION || element.kind === NodeKind.IF || element.kind === NodeKind.WHILE;
    }

    static isInteraction(element: DiagramElement): element is Node {
        return element.kind === NodeKind.INTERACTION;
    }

    static isEndpointCall(element: DiagramElement): element is Node {
        return element.kind === NodeKind.INTERACTION && element.interactionType === InteractionType.ENDPOINT_CALL;
    }

    static isFunctionCall(element: DiagramElement): element is Node {
        return element.kind === NodeKind.INTERACTION && element.interactionType === InteractionType.FUNCTION_CALL;
    }

    static isReturn(element: DiagramElement): element is Node {
        return element.kind === NodeKind.INTERACTION && element.interactionType === InteractionType.RETURN;
    }

    static isIf(element: DiagramElement): element is Node {
        return element.kind === NodeKind.IF;
    }

    static isWhile(element: DiagramElement): element is Node {
        return element.kind === NodeKind.WHILE;
    }
}
