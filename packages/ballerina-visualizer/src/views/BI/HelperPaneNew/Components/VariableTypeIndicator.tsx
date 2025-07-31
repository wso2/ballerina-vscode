import { ThemeColors } from "@wso2/ui-toolkit";
import { pad } from "lodash";

const getTypeColor = (type: string, isRow: boolean): string => {
    //TODO: change if need
    return ThemeColors.PRIMARY
}

type VariableTypeIndifcatorProps = {
    type: string;
    isRow?: boolean;
}
export const VariableTypeIndifcator = ({type, isRow = true}: VariableTypeIndifcatorProps) => {
    return (
        <div style={{backgroundColor: getTypeColor(type, isRow), fontWeight: 'bold', padding: '2px 5px',   fontSize: '11px' , borderRadius: '4px'}}>
            <span>{`${type}`}</span>
        </div>
    );
}   