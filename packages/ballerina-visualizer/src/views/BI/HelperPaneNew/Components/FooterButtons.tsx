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