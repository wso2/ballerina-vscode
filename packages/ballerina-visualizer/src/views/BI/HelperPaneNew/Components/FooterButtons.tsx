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

import { Button, Codicon, ThemeColors } from "@wso2/ui-toolkit";
import styled from '@emotion/styled';

const InvisibleButton = styled.button`
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    text-align: inherit;
    color: inherit;
    font: inherit;
    cursor: pointer;
    outline: none;
    box-shadow: none;
    appearance: none;
    display: inline-flex;
    align-items: center;
`;

type FooterButtonProps = {
    onClick?: () => void;
    startIcon: string;
    title: string;
    sx?: React.CSSProperties;
    disabled?:boolean;
}

const FooterButtons = (props: FooterButtonProps) => {
    const { onClick, startIcon, title, sx } = props;
    return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", margin: "5px", ...sx }}>
            <InvisibleButton 
            disabled={props.disabled}
            onClick={onClick}>
                <Codicon name={startIcon} sx={{color: ThemeColors.PRIMARY}}/>
                <span style={{color: ThemeColors.PRIMARY, marginLeft: "10px" }}>{title}</span>
            </InvisibleButton>
        </div>
    )
}

export default FooterButtons;
