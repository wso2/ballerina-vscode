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
import { useState, useEffect } from "react";
import { PrimitiveBalType } from "@wso2/ballerina-core";

export const ObjectBalType = "object";

// Input types that the dm were supporting even before expanding the type support
export const DM_INHERENTLY_SUPPORTED_INPUT_TYPES = [
    PrimitiveBalType.Boolean,
    PrimitiveBalType.Decimal,
    PrimitiveBalType.Float,
    PrimitiveBalType.Int,
    PrimitiveBalType.Record,
    PrimitiveBalType.String,
    PrimitiveBalType.Json
];

export const DM_UNSUPPORTED_TYPES = [
    PrimitiveBalType.Enum,
    PrimitiveBalType.Error,
    PrimitiveBalType.Xml,
    PrimitiveBalType.Var,
    PrimitiveBalType.Nil,
    ObjectBalType
];

const balVersionRegex = new RegExp("^[0-9]{4}.[0-9]+.[0-9]+");

export const ISSUES_URL = "https://github.com/wso2/product-ballerina-integrator/issues";

export function isDMSupported(version: string): boolean {
    if (!version) {
        return false;
    }
    const versionStr = version.match(balVersionRegex);
    const splittedVersions = versionStr[0]?.split(".");
    if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) === 1)) {
        // 2201.1.x
        return (parseInt(splittedVersions[2], 10) >= 2);
    } else  if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) === 2)) {
        // 2201.2.x
        return (parseInt(splittedVersions[2], 10) >= 1);
    } else  if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) > 2)) {
        // > 2201.2
        return true;
    } else  if (parseInt(splittedVersions[0], 10) > 2201) {
        // > 2201 (eg: 2301, 2202)
        return true;
    } else {
        return false;
    }
}

export function isArraysSupported(version: string): boolean {
    if (!version) {
        return false;
    }
    const versionStr = version.match(balVersionRegex);
    const splittedVersions = versionStr[0]?.split(".");
    if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) === 1)) {
        // >= 2201.1.3
        return (parseInt(splittedVersions[2], 10) >= 3);
    } else  if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) === 2)) {
        // >= 2201.2.4
        return (parseInt(splittedVersions[2], 10) >= 4);
    } else  if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) === 3)) {
        // >= 2201.3.1
        return (parseInt(splittedVersions[2], 10) >= 1);
    } else  if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) > 3)) {
        // > 2201.3
        return true;
    } else  if (parseInt(splittedVersions[0], 10) > 2201) {
        // > 2201 (eg: 2301, 2202)
        return true;
    } else {
        return false;
    }
}

export function isGoToQueryWithinLetExprSupported(version: string): boolean {
    if (!version) {
        return false;
    }
    const versionStr = version.match(balVersionRegex);
    const splittedVersions = versionStr[0]?.split(".");
    if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) === 3)) {
        // >= 2201.3.3
        return (parseInt(splittedVersions[2], 10) >= 3);
    } else  if ((parseInt(splittedVersions[0], 10) === 2201) && (parseInt(splittedVersions[1], 10) > 3)) {
        // > 2201.3
        return true;
    } else  if (parseInt(splittedVersions[0], 10) > 2201) {
        // > 2201 (eg: 2301, 2202)
        return true;
    } else {
        return false;
    }
}

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState<boolean>(false);

    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }

        const listener = () => {
            setMatches(media.matches);
        };

        media.addEventListener("change", listener);
        return () => media.removeEventListener("change", listener);
    }, [matches, query]);

    return matches;
}
