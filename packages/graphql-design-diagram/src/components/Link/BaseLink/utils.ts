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

import { PortModelAlignment } from '@projectstorm/react-diagrams';

export function getOpposingPort(currentPortID: string, port: PortModelAlignment): string {
    if (port === PortModelAlignment.LEFT) {
        return currentPortID.replace(PortModelAlignment.RIGHT, PortModelAlignment.LEFT);
    } else if (port === PortModelAlignment.RIGHT) {
        return currentPortID.replace(PortModelAlignment.LEFT, PortModelAlignment.RIGHT);
    } else if (port === PortModelAlignment.TOP) {
        return currentPortID.replace(PortModelAlignment.BOTTOM, PortModelAlignment.TOP);
    } else {
        return currentPortID.replace(PortModelAlignment.TOP, PortModelAlignment.BOTTOM);
    }
}
