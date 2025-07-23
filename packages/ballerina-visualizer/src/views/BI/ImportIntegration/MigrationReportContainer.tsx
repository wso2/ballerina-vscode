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

import React, { useEffect, useRef } from "react";

interface MigrationReportContainerProps {
    htmlContent: string;
}

const MigrationReportContainer: React.FC<MigrationReportContainerProps> = ({ htmlContent }) => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        // Create a Shadow Root if one doesn't already exist.
        if (!host.shadowRoot) {
            host.attachShadow({ mode: "open" });
        }

        // Set the HTML content of the Shadow Root.
        // The styles inside will be scoped to this component.
        host.shadowRoot!.innerHTML = htmlContent;
    }, [htmlContent]);

    return <div ref={hostRef} />;
};

export default MigrationReportContainer;
