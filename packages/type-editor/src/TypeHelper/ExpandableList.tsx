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

import { HorizontalListContainer, HorizontalListItem, HorizontalListItemLeftContent } from "./styles/HorizontalList"
import React from "react";
import styled from "@emotion/styled";


type ExpandableListProps = {
    children: React.ReactNode;
    sx?: React.CSSProperties;
};

export const ExpandableList = ({ children, sx }: ExpandableListProps) => {
    return (
        <HorizontalListContainer style={sx}>
            {children}
        </HorizontalListContainer>
    );
};

interface ExpandableListItemProps {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
    sx?: React.CSSProperties;
}

const Item = ({ children, onClick, sx }: ExpandableListItemProps) => {
    return (
        <HorizontalListItem onClick={onClick} style={sx} className="expandable-list-item">
            <HorizontalListItemLeftContent>
                {children}
            </HorizontalListItemLeftContent>
        </HorizontalListItem>
    );
};

interface ExpandableListSectionProps {
    children: React.ReactNode;
    title: React.ReactNode;
    level?: number;
    sx?: React.CSSProperties;
}


const Section = ({ children, title, level = 0, sx }: ExpandableListSectionProps) => {
    return (
        <ExpandableListSection style={{ ...sx, display: 'flex', flexDirection: 'column' }}>
            <ExpandableListSectionTitle style={{ marginLeft: '8px'}}>{title}</ExpandableListSectionTitle>
            {children}
        </ExpandableListSection>
    );
};




ExpandableList.Item = Item;
ExpandableList.Section = Section;

export default ExpandableList;


const ExpandableListSection = styled.div`
      
`;

const ExpandableListSectionTitle = styled.span`
    font-weight: 600;
`;
