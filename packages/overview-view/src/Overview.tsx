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
import React, { useEffect, useState } from 'react';
import { useRpcContext } from "@wso2/ballerina-rpc-client"

import { ComponentListView } from './ComponentListView';
import { TitleBar } from './components/TitleBar';
import { WorkspacesFileResponse, VisualizerLocation } from '@wso2/ballerina-core';
import { URI } from 'vscode-uri';
// Create an interface for the module
interface Module {
    functions: any[];
    services: any[];
    records: any[];
    objects: any[];
    classes: any[];
    types: any[];
    constants: any[];
    enums: any[];
    listeners: any[];
    moduleVariables: any[];
}
// Create an interface for the package
interface Package {
    name: string;
    filePath: string;
    modules: Module[];
}
// Create an interface for the data
interface Data {
    packages: Package[];
}

export const SELECT_ALL_FILES = 'All';

export function Overview(props: { visualizerLocation: VisualizerLocation }) {
    const { syntaxTree } = props.visualizerLocation;
    const [components, setComponents] = useState<Data>();
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [workspaceInfo, setWorkspaceInfo] = useState<WorkspacesFileResponse>();
    const [selectedFile, setSelectedFile] = useState<string>(SELECT_ALL_FILES);
    const { rpcClient } = useRpcContext();

    const [isPanelOpen, setPanelOpen] = useState(false);

    const openPanel = () => {
        setPanelOpen(!isPanelOpen);
    };

    const handleSearch = (value: string) => {
        setQuery(value);
    };

    const handleFileChange = async (value: string) => {
        setSelectedFile(value);
        const componentResponse = (value === SELECT_ALL_FILES) ?
            await rpcClient.getLangClientRpcClient().getBallerinaProjectComponents(undefined) :
            await rpcClient.getLangClientRpcClient().getBallerinaProjectComponents({
                documentIdentifiers: [{ uri: URI.file(value).toString() }]
            });
        setComponents(componentResponse as Data);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const workspaceResponse = await rpcClient.getCommonRpcClient().getWorkspaceFiles({});
                setWorkspaceInfo(workspaceResponse);
                const componentResponse = await rpcClient.getLangClientRpcClient().getBallerinaProjectComponents(undefined);
                setComponents(componentResponse as Data);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [syntaxTree, rpcClient]);

    if (loading) {
        // Render a loading indicator
        return <div>Loading...</div>;
    }

    // Filter the components based on the search query
    const filteredComponents = components?.packages.map(pkg => {
        const modules = pkg.modules.map(module => {
            const services = module.services.filter(service => {
                if (selectedFile === SELECT_ALL_FILES || service.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return service.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const types = module.types.filter(type => {
                if (selectedFile === SELECT_ALL_FILES || type.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return type.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const functions = module.functions.filter(func => {
                if (selectedFile === SELECT_ALL_FILES || func.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return func.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const records = module.records.filter(record => {
                if (selectedFile === SELECT_ALL_FILES || record.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return record.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const objects = module.objects.filter(object => {
                if (selectedFile === SELECT_ALL_FILES || object.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return object.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const classes = module.classes.filter(cls => {
                if (selectedFile === SELECT_ALL_FILES || cls.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return cls.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const constants = module.constants.filter(constant => {
                if (selectedFile === SELECT_ALL_FILES || constant.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return constant.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const enums = module.enums.filter(enumType => {
                if (selectedFile === SELECT_ALL_FILES || enumType.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return enumType.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const listeners = module.listeners.filter(listener => {
                if (selectedFile === SELECT_ALL_FILES || listener.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return listener.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            const moduleVariables = module.moduleVariables.filter(variable => {
                if (selectedFile === SELECT_ALL_FILES || variable.filePath === selectedFile.replace(workspaceInfo?.workspaceRoot, '').substring(1)) {
                    return variable.name.toLowerCase().includes(query.toLowerCase());
                }
            });
            return {
                ...module,
                services,
                types,
                functions,
                records,
                objects,
                classes,
                constants,
                enums,
                listeners,
                moduleVariables,
            };
        });
        return {
            ...pkg,
            modules,
        };
    });

    return (
        <>
            <TitleBar query={query} selectedFile={selectedFile} workspacesFileResponse={workspaceInfo} onSelectedFileChange={handleFileChange} onQueryChange={handleSearch} />
            {components ? (
                <ComponentListView currentComponents={{ packages: filteredComponents }} />
            ) : (
                <div>No data available</div>
            )}
        </>
    );
}
