import { HorizontalListContainer, HorizontalListItem, HorizontalListItemLeftContent } from "../styles/HorizontalList"
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
    title: string;
    level?: number;
    sx?: React.CSSProperties;
}


const Section = ({ children, title, level = 0, sx }: ExpandableListSectionProps) => {
    return (
        <ExpandableListSection level={level} style={{ ...sx , display: 'flex', flexDirection: 'column'}}>
            <ExpandableListSectionTitle>{title}</ExpandableListSectionTitle>
            {children}
        </ExpandableListSection>
    );
};




ExpandableList.Item = Item;
ExpandableList.Section = Section;

export default ExpandableList;


const ExpandableListSection = styled.div<{ level?: number }>`
    padding-left: ${({ level = 0 }) => (level * 5) + 10}px;
`;


const ExpandableListSectionTitle = styled.span`
    font-weight: 600;
`;