import React, { useState, cloneElement, isValidElement, ReactNode, ReactElement, useEffect } from "react";
import { createPortal } from "react-dom";
import styled from "@emotion/styled";
import { Codicon, Divider, ThemeColors } from "@wso2/ui-toolkit";

export type DynamicModalProps = {
    children: ReactNode;
    onClose?: () => void;
    title: string;
    anchorRef: React.RefObject<HTMLDivElement>;
    width?: number;
    height?: number;
    openState: boolean;
    setOpenState: (state: boolean)=>void;
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 30000 !important;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModalBox = styled.div<{ width?: number; height?: number }>`
  width: ${({ width }: { width?: number }) => (width ? `${width}px` : 'auto')};
  height: ${({ height }: { height?: number }) => (height ? `${height}px` : 'auto')};
  background-color: ${ThemeColors.PRIMARY_CONTAINER};
  position: relative;
  padding: 10px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
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
    margin: 0;
    position: absolute;
    top: 8px;
    left: 8px;
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

    useEffect(()=>{
        console.log("inside")
        setOpenState(openState)
    }, [openState]);

    return (
        <>
            {trigger}
            {openState && createPortal(
                <Overlay className="unq-modal-overlay" ref={anchorRef}>
                    <ModalBox width={width} height={height}>
                        <InvisibleButton onClick={handleClose} style={{ position: "absolute", top: 8, right: 8 }}>
                            <Codicon name="close" />
                        </InvisibleButton>
                        <Title>{title}</Title>
                        <Divider sx={{marginTop: "40px"}}/>
                        <div>{content}</div>
                    </ModalBox>
                </Overlay>,
                document.body
            )}
        </>
    );
};

DynamicModal.Trigger = Trigger;

export default DynamicModal;