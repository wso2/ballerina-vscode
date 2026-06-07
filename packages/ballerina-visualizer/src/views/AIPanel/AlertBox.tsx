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
    buttonTitle: string;
    iconName?: string;
    variant?: 'primary' | 'secondary';
    onClick?: () => void;
    buttonDisabled?: boolean;
    buttonId?: string;
}

export const AlertBox = (props: Props) => {
    const { title, buttonTitle, subTitle, iconName, variant = 'primary', buttonDisabled = false, onClick, buttonId } = props;
    return (
        <Container variant={variant}>
            {title && <Title>{title}</Title>}
            {subTitle && <SubTitle>{subTitle}</SubTitle>}
            <VSCodeButton onClick={onClick} appearance={variant} id={`alert-btn${buttonId ? `-${buttonId}` : ''}`}>
                {iconName && (
                    <>
                        <Codicon name={iconName} /> &nbsp;{" "}
                    </>
                )}
                {buttonTitle}
            </VSCodeButton>
        </Container>
    );
};
