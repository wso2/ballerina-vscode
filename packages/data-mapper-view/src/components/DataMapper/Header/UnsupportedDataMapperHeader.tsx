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
// tslint:disable: jsx-no-multiline-js
import React from "react";

import styled from "@emotion/styled";
import { Button, ButtonProps, Codicon } from "@wso2/ui-toolkit";

export interface DataMapperHeaderProps {
    onClose: () => void;
}

function Home(props: ButtonProps) {
    return (
        <Button
            appearance="icon"
            {...props}
        >
            <Codicon name="home" /> 
        </Button>
    )
}

export function UnsupportedDataMapperHeader(props: DataMapperHeaderProps) {
    const { onClose } = props;
    return (
        <HeaderContainer>
            <HomeButton onClick={onClose} />
            <Title> Data Mapper </Title>
        </HeaderContainer>
    );
}

const HeaderContainer = styled.div`
    width: 100%;
    height: 50px;
    display: flex;
    padding: 15px;
    background-color: white;
`;

const HomeButton = styled(Home)`
    cursor: pointer;
    margin-right: 10px;
`;

const Title = styled.div`
    font-weight: 600;
    margin-right: 10px;
`;
