import { ThemeColors } from "@wso2/ui-toolkit";
import styled from "@emotion/styled";

const SelectableItem = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px;
    &:hover {
        background-color: ${ThemeColors.SURFACE_DIM};
        cursor: pointer;
    }
`

export default SelectableItem;