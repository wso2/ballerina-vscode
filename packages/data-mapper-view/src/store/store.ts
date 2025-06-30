import { LangClientRpcClient } from '@wso2/ballerina-rpc-client';
import { FunctionDefinition } from '@wso2/syntax-tree';
import { create } from 'zustand';

export interface DataMapperState {
  imports: string[];
  setImports: (imports: string[]) => void;
  importReferenceMap: Record<string, string>;
  setImportReferenceMap: (importReferenceMap: Record<string, string>) => void;
  functionST: FunctionDefinition;
  setFunctionST: (st: FunctionDefinition) => void;
  filePath: string;
  setFilePath: (filePath: string) => void;
  langClientPromise: LangClientRpcClient;
  setLangClientPromise: (lCP: LangClientRpcClient) => void;
}

export interface DataMapperSearchState {
  inputSearch: string;
  setInputSearch: (inputSearch: string) => void;
  outputSearch: string;
  setOutputSearch: (outputSearch: string) => void;
  resetSearchStore: () => void;
}

export interface DataMapperFocusedViewState {
  sourcePortFQN: string;
  targetPortFQN: string;
  setPortFQNs: (sourcePortFQN: string, targetPortFQN: string) => void;
  resetFocusedViewState: () => void;
}

export const useDMStore = create<DataMapperState>((set) => ({
  imports: [],
  importReferenceMap: {},
  functionST: undefined,
  filePath: undefined,
  langClientPromise: undefined,
  setFunctionST: (functionST: FunctionDefinition) => set({ functionST }),
  setImports: (imports) => set({ imports }),
  setImportReferenceMap: (importReferenceMap) => set({ importReferenceMap }),
  setFilePath: (filePath: string) => set({ filePath }),
  setLangClientPromise: (langClientPromise: LangClientRpcClient) => set({ langClientPromise }),
}));


export const useDMSearchStore = create<DataMapperSearchState>((set) => ({
  inputSearch: "",
  outputSearch: "",
  setInputSearch: (inputSearch: string) => set({ inputSearch }),
  setOutputSearch: (outputSearch: string) => set({ outputSearch }),
  resetSearchStore: () => set({ inputSearch: '', outputSearch: '' })
}));

export const useDMFocusedViewStateStore = create<DataMapperFocusedViewState>((set) => ({
  sourcePortFQN: "",
  targetPortFQN: "",
  setPortFQNs: (sourcePortFQN: string, targetPortFQN: string) => set({ sourcePortFQN, targetPortFQN }),
  resetFocusedViewState: () => set({ sourcePortFQN: '', targetPortFQN: '' })
}));
