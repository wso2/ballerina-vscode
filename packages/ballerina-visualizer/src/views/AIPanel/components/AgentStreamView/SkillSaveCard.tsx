/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.
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
import { SkillSaveStage } from "@wso2/ballerina-core";
import {
    InlineCard,
    InlineCardHeader,
    InlineCardIcon,
    InlineCardTitle,
    InlineCardSubtitle,
} from "./styles";

interface SkillSaveCardProps {
    data: Record<string, any>;
}

const SkillSaveCard: React.FC<SkillSaveCardProps> = ({ data }) => {
    const { stage, name, tier, scope } = data;

    if (stage === SkillSaveStage.PROMPTING) {
        return null;
    }

    if (stage === SkillSaveStage.SAVED) {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-pass" />
                    </InlineCardIcon>
                    <InlineCardTitle>Skill &ldquo;{name}&rdquo; saved</InlineCardTitle>
                    {tier && (
                        <InlineCardSubtitle style={{ marginLeft: "auto" }}>
                            {tier === "user" ? "User skill" : scope === "integration" ? "Integration skill" : "Project skill"}
                        </InlineCardSubtitle>
                    )}
                </InlineCardHeader>
            </InlineCard>
        );
    }

    if (stage === SkillSaveStage.CANCELLED) {
        return (
            <InlineCard status="done">
                <InlineCardHeader>
                    <InlineCardIcon>
                        <span className="codicon codicon-circle-slash" style={{ opacity: 0.5 }} />
                    </InlineCardIcon>
                    <InlineCardTitle style={{ opacity: 0.6 }}>Skill save cancelled</InlineCardTitle>
                </InlineCardHeader>
            </InlineCard>
        );
    }

    return null;
};

export default SkillSaveCard;
