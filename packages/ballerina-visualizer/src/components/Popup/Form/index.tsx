import styled from "@emotion/styled";
import { Codicon, Divider, Typography } from "@wso2/ui-toolkit";
import { ThemeColors } from "@wso2/ui-toolkit/lib/styles/Theme";

const PopupFormContainer = styled.div`
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

const PopupFormBox = styled.div<{ width?: number; height?: number }>`
  width: ${({ width }: { width?: number }) => (width ? `${width}px` : 'auto')};
  height: ${({ height }: { height?: number }) => (height ? `${height}px` : 'auto')};
  position: relative;
  display: flex;
  flex-direction: column;
  overflow-y: hidden;
  padding: 16px;
  border-radius: 3px;
  background-color: ${ThemeColors.SURFACE_DIM};
  box-shadow: 0 3px 8px rgb(0 0 0 / 0.2);
    z-index: 30001;
`;

const PopupFormHeader = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-inline: 16px;
`;

export type PopupFormProps = {
    width?: number;
    height?: number;
    title: string;
    children: React.ReactNode;
    onClose?: () => void;
};

export const PopupForm = (props: PopupFormProps) => {
    const { width, height, title, children, onClose } = props;

    return (
        <PopupFormContainer>
            <PopupFormBox width={width} height={height}>
                <PopupFormHeader>
                    <Typography variant="h2" sx={{ margin: 0 }}>
                        {title}
                    </Typography>
                     <Codicon name="close" onClick={onClose} />
                </PopupFormHeader>
                <Divider />
                <div>{children}</div>
            </PopupFormBox>
        </PopupFormContainer>
    )
}