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

import type { ComponentKind, ContextItemEnriched } from "@wso2/wso2-platform-core";
import { extension } from "../../BalExtensionContext";
import { createStore } from "zustand";
import { createJSONStorage, persist, PersistOptions } from "zustand/middleware";
import { PlatformExtState } from "@wso2/ballerina-core/lib/rpc-types/platform-ext/interfaces";

interface PlatformExtStore {
	state: PlatformExtState;
	setState: (params: Partial<PlatformExtState>) => void;
}

const initialState: PlatformExtState = { isLoggedIn: false, components: [] };

const version = "v1";

const getWorkspaceStateStore = (storeName: string): PersistOptions<any, any> => {
	return {
		name: `${storeName}-${version}`,
		storage: createJSONStorage(() => ({
			getItem: async (name) => {
				const value = await extension.context.workspaceState.get(name);
				return value ? (value as string) : "";
			},
			removeItem: (name) => extension.context.workspaceState.update(name, undefined),
			setItem: (name, value) => extension.context.workspaceState.update(name, value),
		})),
		skipHydration: true,
	};
};

export const platformExtStore = createStore(
	persist<PlatformExtStore>(
		(set, get) => ({
			state: initialState,
			setState: (params: Partial<PlatformExtState>) => {
				set(({ state }) => ({ state: { ...state, ...params } }));
			}
		}),
		getWorkspaceStateStore("bi-platform-storage"),
	),
);


