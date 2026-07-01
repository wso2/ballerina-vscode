/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import React from "react";
import { SkillEnableStage } from "@wso2/ballerina-core";
import {
    InlineCard,
    InlineCardHeader,
    InlineCardIcon,
    InlineCardTitle,
} from "./styles";

interface SkillEnableCardProps {
    data: Record<string, any>;
}

const SkillEnableCard: React.FC<SkillEnableCardProps> = ({ data }) => {
    const { stage, skillName } = data;

    if (stage === SkillEnableStage.PROMPTING) {
        return null;
    }

    if (stage === SkillEnableStage.ENABLED) {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-pass" />
                    </InlineCardIcon>
                    <InlineCardTitle>Skill &ldquo;{skillName}&rdquo; enabled</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === SkillEnableStage.SKIPPED) {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-circle-slash" style={{ opacity: 0.5 }} />
                    </InlineCardIcon>
                    <InlineCardTitle style={{ opacity: 0.6 }}>Continued without skill</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    return null;
};

export default SkillEnableCard;
