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

import { useQueryClient, useQuery } from "@tanstack/react-query";
import { PlatformExtState } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import React, { useContext, FC, ReactNode, useEffect } from "react";

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
