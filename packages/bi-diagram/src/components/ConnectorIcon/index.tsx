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

import React, { CSSProperties, useState } from "react";
import { Icon } from "@wso2/ui-toolkit";
import { ApiIcon } from "../../resources";
import { getAIColor, ThemeListener } from "../NodeIcon";

interface ConnectorIconProps {
    url?: string;
    fallbackIcon?: React.ReactNode;
    style?: CSSProperties; // Custom style for images
    className?: string;
}

export function ConnectorIcon(props: ConnectorIconProps): React.ReactElement {
    const { url, fallbackIcon, className, style } = props;
    const [imageError, setImageError] = React.useState(false);
    const [themeAwareColor, setThemeAwareColor] = useState<string>(getAIColor());

    // Update color when theme changes
    const handleThemeChange = () => {
        setThemeAwareColor(getAIColor());
    };

    // use custom icon for http
    if (url?.includes("ballerina_http_")) {
        return <Icon name="bi-globe" className={className} sx={{ width: 24, height: 24, fontSize: 24, ...style }} />;
    }

    // use custom icon for ai module
    if (url?.includes("ballerinax_ai_")) {
        return (
            <>
                <Icon 
                    name="bi-ai-agent" 
                    className={className} 
                    sx={{ width: 24, height: 24, fontSize: 24, color: themeAwareColor, ...style }} 
                />
                <ThemeListener onThemeChange={handleThemeChange} />
            </>
        );
    }

    if (url && isValidUrl(url) && !imageError) {
        return <img src={url} className={className} onError={() => setImageError(true)} style={{ ...style }} />;
    }

    if (fallbackIcon) {
        return <div className={className}>{fallbackIcon}</div>;
    }

    return (
        <div style={style} className={className}>
            <ApiIcon />
        </div>
    );
}

function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

export default ConnectorIcon;
