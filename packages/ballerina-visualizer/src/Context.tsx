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

import React, { ReactNode, useRef, useState, createContext, useContext, FC, useEffect } from "react";
import { BallerinaRpcClient, VisualizerContext as RpcContext, Context, useRpcContext } from "@wso2/ballerina-rpc-client";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { ConnectorInfo, TriggerModelsResponse} from "@wso2/ballerina-core";
import { PlatformExtState } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export function RpcContextProvider({ children }: { children: ReactNode }) {
    const rpcClient = useRef(new BallerinaRpcClient());

    const contextValue: RpcContext = {
        rpcClient: rpcClient.current,
    };

    return <Context.Provider value={contextValue}>{children}</Context.Provider>;
}



export enum PanelType {
    STATEMENTEDITOR = "STATEMENTEDITOR",
    CONSTRUCTPANEL = "CONSTRUCTPANEL",
};

interface PanelDetails {
    isActive: boolean;
    name?: PanelType;
    contentUpdated?: boolean;
}

interface ComponentInfo {
    model: STNode;
    position: NodePosition;
    componentType: string;
    connectorInfo?: ConnectorInfo;
}

interface ActiveFileInfo {
    fullST: STNode;
    filePath: string;
    activeSequence: STNode;
}

export type SidePanel = "EMPTY" | "RECORD_EDITOR" | "ADD_CONNECTION" | "ADD_ACTION";

interface VisualizerContext {
    popupMessage: boolean;
    setPopupMessage: (value: boolean) => void;
    sidePanel: SidePanel;
    screenMetadata: any;
    setSidePanel: (panel: SidePanel) => void;
    setScreenMetadata: (metadata: any) => void;
    activePanel: PanelDetails;
    setActivePanel: (panelDetails: PanelDetails) => void;
    statementPosition: NodePosition;
    setStatementPosition: (position: NodePosition) => void;
    activeFileInfo?: ActiveFileInfo;
    setActiveFileInfo?: (activeFileInfo: ActiveFileInfo) => void;
    componentInfo?: ComponentInfo;
    setComponentInfo?: (componentInfo: ComponentInfo) => void;
    cacheTriggers: TriggerModelsResponse,
    setCacheTriggers: (componentInfo: TriggerModelsResponse) => void;
    showOverlay: boolean;
    setShowOverlay: (value: boolean) => void;
}

export const VisualizerContext = createContext({
    activePanel: { isActive: false },
    setActivePanel: (panelDetails: PanelDetails) => { },
    statementPosition: undefined,
    setStatementPosition: (position: NodePosition) => { },
    activeFileInfo: undefined,
    setActiveFileInfo: (activeFileInfo: ActiveFileInfo) => { },
    componentInfo: undefined,
    setComponentInfo: (componentInfo: ComponentInfo) => { },
    cacheTriggers: undefined,
    setCacheTriggers: (triggers: TriggerModelsResponse) => { },
    setShowOverlay: (value: boolean) => { },

} as VisualizerContext);

export function VisualizerContextProvider({ children }: { children: ReactNode }) {
    const [popupMessage, setPopupMessage] = useState(false);
    const [sidePanel, setSidePanel] = useState("EMPTY" as SidePanel);
    const [metadata, setMetadata] = useState({} as any);
    const [activePanel, setActivePanel] = useState({ isActive: false });
    const [statementPosition, setStatementPosition] = useState<NodePosition>();
    const [componentInfo, setComponentInfo] = useState<ComponentInfo>();
    const [activeFileInfo, setActiveFileInfo] = useState<ActiveFileInfo>();
    const [cacheTriggers, setCacheTriggers] = useState<TriggerModelsResponse>({ local: [] });
    const [showOverlay, setShowOverlay] = useState(false);


    const contextValue: VisualizerContext = {
        popupMessage: popupMessage,
        screenMetadata: metadata,
        setPopupMessage: setPopupMessage,
        sidePanel: sidePanel,
        setSidePanel: setSidePanel,
        setScreenMetadata: setMetadata,
        activePanel: activePanel,
        setActivePanel: setActivePanel,
        statementPosition: statementPosition,
        setStatementPosition: setStatementPosition,
        activeFileInfo: activeFileInfo,
        setActiveFileInfo: setActiveFileInfo,
        componentInfo: componentInfo,
        setComponentInfo: setComponentInfo,
        cacheTriggers: cacheTriggers,
        setCacheTriggers: setCacheTriggers,
        showOverlay: showOverlay,
        setShowOverlay: setShowOverlay
    };

    return <VisualizerContext.Provider value={contextValue}>{children}</VisualizerContext.Provider>;
}

export const useVisualizerContext = () => useContext(VisualizerContext);

export const POPUP_IDS = {
  VARIABLE: "VARIABLE",
  FUNCTION: "FUNCTION",
  CONFIGURABLES: "CONFIGURABLES",
  RECORD_CONFIG: "RECORD_CONFIG",
} as const;

type ModalStackItem = {
    modal: ReactNode;
    id: string;
    title: string;
    height?: number;
    width?: number;
}

interface ModalStackContext {
    modalStack: ModalStackItem[];
    addModal: (modal: ReactNode, id: string, title: string, height?: number, width?: number) => void;
    popModal: () => void;
    closeModal: (id: string) => void;
}

export const ModalStackContext = createContext({
    modalStack: [],
    addModal: (modal: ReactNode, id: string, title: string, height?: number, width?: number) => { },
    popModal: () => { },
    closeModal: (id: string) => { },
} as ModalStackContext);

export const ModalStackProvider = ({children}: {children: ReactNode}) => {
    const [modalStack, setModalStack] = useState<ModalStackItem[]>([]);

    const addModal = (modal: ReactNode, id: string, title: string, height?: number, width?: number) => {
        setModalStack((prevStack) => [...prevStack, { modal, id, title, height, width }]);
    };

    const popModal = () => {
        setModalStack((prevStack) => prevStack.slice(0, -1));
    };

    const closeModal = (id: string) => {
        setModalStack((prevStack) => prevStack.filter((item) => item.id !== id));
    };

    return <ModalStackContext.Provider value={{ modalStack, addModal, popModal, closeModal }}>
        {children}
    </ModalStackContext.Provider>;
}

export const useModalStack = () => useContext(ModalStackContext);

// Platform extension context
const defaultPlatformExtContext: { state: PlatformExtState | null } = { state: {components: [], isLoggedIn: false }};

const PlatformExtContext = React.createContext(defaultPlatformExtContext);

export const usePlatformExtContext = () => {
	return useContext(PlatformExtContext) || defaultPlatformExtContext;
};

export const PlatformExtContextProvider: FC<{children: ReactNode}> = ({ children }) => {
	const queryClient = useQueryClient();
    const { rpcClient } = useRpcContext();

	const {
		data: platformExtState,
	} = useQuery({
		queryKey: ["platform-ext-state"],
		queryFn: async () => {
            const projectPath = await rpcClient.getVisualizerLocation()
            const isLoggedIn = await rpcClient.getPlatformRpcClient().isLoggedIn();
            const components = await rpcClient.getPlatformRpcClient().getDirectoryComponents(projectPath.projectUri)
            const selectedContext = await rpcClient.getPlatformRpcClient().getSelectedContext();
            // todo: get state as it is instead of individual functions
            return { isLoggedIn, components, selectedContext } as PlatformExtState
        },
		refetchOnWindowFocus: true,
	});

	useEffect(() => {
		rpcClient.getPlatformRpcClient().onPlatformExtStoreStateChange((state) => {
			queryClient.setQueryData(["platform-ext-state"], state);
		});
	}, []);

	return (
		<PlatformExtContext.Provider value={{ state: platformExtState}}>
			{children}
		</PlatformExtContext.Provider>
	);
};
