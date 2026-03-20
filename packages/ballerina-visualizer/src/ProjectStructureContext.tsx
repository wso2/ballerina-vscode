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

import React, { createContext, useContext } from "react";
import { ProjectStructureResponse } from "@wso2/ballerina-core";

type ProjectStructureContextType = {
    projectStructure: ProjectStructureResponse | null;
    setProjectStructure: React.Dispatch<React.SetStateAction<ProjectStructureResponse | null>>;
};

const ProjectStructureContext = createContext<ProjectStructureContextType | undefined>(undefined);

export const ProjectStructureProvider: React.FC<{
    value: ProjectStructureContextType;
    children: React.ReactNode;
}> = ({ value, children }) => {
    return <ProjectStructureContext.Provider value={value}>{children}</ProjectStructureContext.Provider>;
};

export const useProjectStructure = () => {
    const context = useContext(ProjectStructureContext);
    if (!context) {
        throw new Error("useProjectStructure must be used within a ProjectStructureProvider");
    }
    return context;
};

export default ProjectStructureContext;
