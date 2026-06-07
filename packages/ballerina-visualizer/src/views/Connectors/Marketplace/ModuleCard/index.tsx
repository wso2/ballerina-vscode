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

import { ModuleIcon } from "@wso2/ballerina-low-code-diagram";

import useStyles from "./style";
import { BallerinaConstruct } from "@wso2/ballerina-core";
import { Tooltip } from "@wso2/ui-toolkit";

export interface ModuleCardProps {
    onSelectModule: (balModule: BallerinaConstruct) => void;
    module: BallerinaConstruct;
    columns?: number;
}
export const MAX_COLUMN_WIDTH = '155px';

function ModuleCard(this: any, props: ModuleCardProps) {
    const classes = useStyles();
    const { module, columns, onSelectModule } = props;
    const moduleName = (module.displayAnnotation?.label || `${module.package?.name} / ${module.name}`).replace(/["']/g, "");
    return (
        <div className={classes.balModule} onClick={onSelectModule.bind(this, module)}>
            <div>
                <ModuleIcon module={module} scale={0.9} />
            </div>
            <Tooltip content={`${module.package?.organization} / ${module.moduleName} : ${module.package?.version}`}>
                <div className={classes.balModuleName}>{moduleName}</div>
            </Tooltip>
            <div className={classes.orgName}>by {module.package.organization}</div>
        </div>
    );
}

export default ModuleCard;
