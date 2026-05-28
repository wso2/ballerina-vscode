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

import { Icon, SlidingPaneNavContainer, Typography } from "@wso2/ui-toolkit";
import { ExpandableList } from "../Components/ExpandableList";

export enum AIDocumentType {
    FileDocument = 'ai:FileDocument',
    ImageDocument = 'ai:ImageDocument',
    AudioDocument = 'ai:AudioDocument'
}

export const Documents = () => {
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
            <div style={{ padding: '8px 0px' }}>
                <ExpandableList>
                    <SlidingPaneNavContainer
                        to="DOCUMENT_CONFIG"
                        data={{ documentType: AIDocumentType.FileDocument }}
                    >
                        <ExpandableList.Item>
                            <Icon name="bi-doc" sx={{ fontSize: "16px" }} />
                            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                File Document
                            </Typography>
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>

                    <SlidingPaneNavContainer
                        to="DOCUMENT_CONFIG"
                        data={{ documentType: AIDocumentType.ImageDocument }}
                    >
                        <ExpandableList.Item>
                            <Icon name="bi-image" sx={{ fontSize: "16px" }} />
                            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                Image Document
                            </Typography>
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>

                    <SlidingPaneNavContainer
                        to="DOCUMENT_CONFIG"
                        data={{ documentType: AIDocumentType.AudioDocument }}
                    >
                        <ExpandableList.Item>
                            <Icon name="bi-audio" sx={{ fontSize: "16px" }} />
                            <Typography variant="body3" sx={{ fontWeight: 600 }}>
                                Audio Document
                            </Typography>
                        </ExpandableList.Item>
                    </SlidingPaneNavContainer>
                </ExpandableList>
            </div>
        </div>
    );
};
