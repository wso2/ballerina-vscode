import styled from "@emotion/styled";
import React from "react";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import { Codicon } from "@wso2/ui-toolkit";


const Container = styled.div<{ variant: 'primary' | 'secondary' }>`
    border-left: 0.3rem solid var(${(props: { variant: string; }) => props.variant === 'secondary' ? '--vscode-editorWidget-border' : '--vscode-focusBorder'});
    background: var(${(props: { variant: string; }) => props.variant === 'secondary' ? 'transparent' : '--vscode-inputValidation-infoBackground'});
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 12px;
    margin-bottom: 15px;
    width: -webkit-fill-available;
`;

const WideVSCodeButton = styled(VSCodeButton as React.ComponentType)`
    width: 100%;
    max-width: 300px;
    align-self: center;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 0.5rem;
    align-items: center;
`;

const Title = styled.div`
    color: var(--vscode-foreground);
    font-weight: 500;
`;

const SubTitle = styled.div`
    color: var(--vscode-descriptionForeground);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
`;

interface Props {
    title?: string;
    subTitle?: string;
    variant?: 'primary' | 'secondary';
    btn1Title: string;
    btn1IconName?: string;
    btn1OnClick?: () => void;
    btn1Id?: string;
    btn2Title: string;
    btn2IconName?: string;
    btn2OnClick?: () => void;
    btn2Id?: string;
}

export const AlertBoxWithClose = (props: Props) => {
    const { title, subTitle,variant = 'primary', btn1Title, btn1IconName, btn1OnClick, btn1Id, btn2Title, btn2IconName, btn2OnClick, btn2Id } = props;
    return (
        <Container variant={variant}>
            {title && <Title>{title}</Title>}
            {subTitle && <SubTitle>{subTitle}</SubTitle>}
            <ButtonGroup>
                <VSCodeButton onClick={btn1OnClick} appearance={variant} id={`alert-btn${btn1Id ? `-${btn1Id}` : ''}`}>
                    {btn1IconName && (
                        <>
                            <Codicon name={btn1IconName} /> &nbsp;{" "}
                        </>
                    )}
                    {btn1Title}
                </VSCodeButton>
                <VSCodeButton onClick={btn2OnClick} appearance='secondary' id={`alert-btn${btn2Id ? `-${btn2Id}` : ''}`}>
                    {btn2IconName && (
                        <>
                            <Codicon name={btn2IconName} /> &nbsp;{" "}
                        </>
                    )}
                    {btn2Title}
                </VSCodeButton>
            </ButtonGroup>
        </Container>
    );
};
