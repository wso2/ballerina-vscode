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
// tslint:disable: ordered-imports
import { css } from "@emotion/css";

export const useStyles = () => ({
    formHeaderTitleWrapper: css({
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        borderBottom: "1px solid #d8d8d8",
        paddingLeft: "12px",
    }),
    titleIcon: css({
        display: "flex",
        padding: "8px",
        paddingLeft: "0",
    }),
    formTitleWrapper: css({
        width: "100%",
        zIndex: 100,
        height: "48px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginLeft: "12px",
    }),
    mainTitleWrapper: css({
        display: "inline-flex",
        alignItems: "center",
        width: "auto",
    }),
    secondTitle: css({
        position: "absolute",
        left: 124,
        display: "flex",
        alignItems: "center",
        "& svg": {
            marginTop: 4,
        },
    }),
});

