import React, { useState, cloneElement, isValidElement, ReactNode, ReactElement, useEffect } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { Codicon, Divider, ThemeColors, Typography } from "@wso2/ui-toolkit";

export type DynamicModalProps = {
    children: ReactNode;
    onClose?: () => void;
    title: string;
    anchorRef: React.RefObject<HTMLDivElement>;
    width?: number;
    height?: number;
    openState: boolean;
    setOpenState: (state: boolean) => void;
};

const ModalContainer = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 30000;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--vscode-editor-inactiveSelectionBackground);
    opacity: 0.4;
`;

const ModalBox = styled.div<{ width?: number; height?: number }>`
  width: ${({ width }: { width?: number }) => (width ? `${width}px` : 'auto')};
  height: ${({ height }: { height?: number }) => (height ? `${height}px` : 'auto')};
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
  padding: 16px;
  border-radius: 8px;
  background-color: ${ThemeColors.PRIMARY_CONTAINER};
  box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 30001;
`;

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

const Title = styled.h1`
    font-size: 1.5rem;
    font-weight: 600;
    margin-left: 20px;
    margin-top: 10px;
    margin-bottom: 10px;
`;

const ModalHeaderSection = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
`;

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };
const Trigger: React.FC<TriggerProps> = (props) => <InvisibleButton {...props}>{props.children}</InvisibleButton>;

const DynamicModal: React.FC<DynamicModalProps> & { Trigger: typeof Trigger } = ({
    children,
    onClose,
    title,
    anchorRef,
    width,
    height,
    openState,
    setOpenState,
}) => {

    let trigger: ReactElement | null = null;
    const content: ReactNode[] = [];

    React.Children.forEach(children, child => {
        if (isValidElement(child) && child.type === DynamicModal.Trigger) {
            trigger = cloneElement(child as React.ReactElement, {
                onClick: () => setOpenState(true)
            });
        } else {
            content.push(child);
        }
    });

    const handleClose = () => {
        setOpenState(false);
        onClose && onClose();
    };

    useEffect(() => {
        console.log("inside")
        setOpenState(openState)
    }, [openState]);

    return (
        <>
            {trigger}
            {openState && createPortal(
                <ModalContainer className="unq-modal-overlay">
                    <Overlay onClick={handleClose} />
                    <ModalBox width={width} height={height}>
                        <ModalHeaderSection>
                            <Typography variant="h2" sx={{ margin: 0}}>
                                {title}
                            </Typography>
                            <Codicon name="close" onClick={handleClose} />
                        </ModalHeaderSection>
                        <Divider />
                        <div>{content}</div>
                    </ModalBox>
                </ModalContainer>,
                document.body
            )}
        </>
    );
};

DynamicModal.Trigger = Trigger;

export default DynamicModal;