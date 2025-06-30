import { ConfigOverlayFormStatus, ConnectorInfo, ConnectorWizardProps, DiagramOverlayPosition, FunctionDef, LineRange, LowcodeEvent, PlusWidgetProps, STModification, STSymbolInfo } from "@wso2/ballerina-core";
import { NodePosition, STNode } from "@wso2/syntax-tree";

import { PlusViewState } from "../ViewState";


export enum ViewMode {
    INTERACTION = 'Interaction',
    STATEMENT = 'Statement'
}

export interface LowCodeDiagramProps extends LowCodeDiagramProperties {
    api?: LowCodeDiagramAPI;
    experimentalEnabled?: boolean;
    onAddComponent?: (targetPosition: NodePosition) => void;
    onEditComponent?: (model: STNode, targetPosition: NodePosition, componentType?: string, connectorInfo?: ConnectorInfo) => void;
    onDeleteComponent?: (model: STNode) => void;
}

export interface ZoomStatus {
    scale: number,
    panX: number,
    panY: number,
}

export interface LowCodeDiagramContext {
    state: LowCodeDiagramState;
    actions: LowCodeDiagramActions;
    api?: LowCodeDiagramAPI;
    props: LowCodeDiagramProperties;
}

export interface LowCodeDiagramProperties {
    syntaxTree: STNode;
    fullST?: STNode; // TODO: make this required once the tests are fixed
    isReadOnly: boolean;
    error?: Error;
    selectedPosition?: SelectedPosition;
    stSymbolInfo?: STSymbolInfo;
    zoomStatus?: ZoomStatus;
    experimentalEnabled?: boolean;
    onDiagramDoubleClick?: () => void,
    getListenerSignature?: (functionNode: STNode) => Promise<string>;
    onAddComponent?: (targetPosition: NodePosition) => void;
    onEditComponent?: (model: STNode, targetPosition: NodePosition, componentType?: string, connectorInfo?: ConnectorInfo) => void;
    onDeleteComponent?: (model: STNode) => void;
}

export interface LowCodeDiagramState {
    triggerUpdated: boolean; // FIXME Moving existing prop manipulated in memory into state
    isDataMapperShown: boolean;
    isConfigOverlayFormOpen: boolean;
    targetPosition: NodePosition; // FIXME check and remove usage of update position if not used anymore
    isDiagramFunctionExpanded: boolean;
    experimentalEnabled?: boolean;
}

export interface LowCodeDiagramActions {
    updateState: (payload: LowCodeDiagramState) => void;
    diagramCleanDraw: (payload: STNode) => void;
    diagramRedraw: (payload: STNode) => void;
    insertComponentStart: (payload: NodePosition) => void;
    editorComponentStart: (payload: STNode) => void;
}


// TODO: move this to commons module
export interface ComponentViewInfo {
    filePath: string;
    position: NodePosition;
    fileName?: string;
    moduleName?: string;
    name?: string;
    uid?: string;
}
// TODO: move this to commons module
export interface FileListEntry {
    fileName: string;
    uri: Uri;
}
// TODO: move this to commons module
export interface Uri {
    fsPath: string
    external: string
    path: string;
    sheme: string;
}

export interface LowCodeDiagramAPI {
    edit?: {
        deleteComponent?: (model: STNode, onDelete?: () => void) => void;
        renderEditForm?: (model: STNode, targetPosition: NodePosition, configOverlayFormStatus: ConfigOverlayFormStatus, onClose?: () => void, onSave?: () => void) => void;
        renderAddForm?: (targetPosition: NodePosition, configOverlayFormStatus: ConfigOverlayFormStatus, onClose?: () => void, onSave?: () => void) => void;
        renderConnectorWizard?: (connectorWizardProps: ConnectorWizardProps) => void;
        renderDialogBox?: (type: string, onConfirm: () => void, onCancel?: () => void, position?: DiagramOverlayPosition, overlayId?: string, message?: string, removeText?: string, isFunctionMember?: boolean) => void;
        renderPlusWidget?: (type: string, plusWidgetProps: PlusWidgetProps, viewState?: PlusViewState) => any;
        closeAllOpenedForms?: (callBack?: () => void) => void;
        openPerformanceChart?: (name: string, range: NodePosition, diagramRedrawFunc: any) => void;
        showTooltip?: (
            component: any,
            content?: string,
            onClick?: () => void,
            additionalParams?: any) => any;
        STNode?: STNode;
    };

    // FIXME Doesn't make sense to take these methods below from outside
    // Move these inside and get an external API for pref persistance
    // against a unique ID (eg AppID) for rerender from prev state
    panNZoom?: {
        pan: (panX: number, panY: number) => void;
        fitToScreen: () => void;
        zoomIn: () => void;
        zoomOut: () => void;
    };

    configPanel?: {
        closeConfigOverlayForm: () => void;
        configOverlayFormPrepareStart: () => void;
        closeConfigPanel: () => void;
    };

    code?: {
        modifyDiagram?: (mutations: STModification[], options?: any) => void;
        gotoSource?: (position: { startLine: number, startColumn: number }) => void;
        getFunctionDef?: (lineRange: any, defFilePath: string) => Promise<FunctionDef>;
    };

    webView?: {
        showTryitView?: (serviceName: string, range: LineRange) => void;
    };

    project?: {
        run: (args: any[]) => void;
    };

    insights?: {
        onEvent?: (event: LowcodeEvent) => void;
    },
    navigation: {
        updateActiveFile: (currentFile: FileListEntry) => void,
        updateSelectedComponent: (info: ComponentViewInfo) => void;
        navigateUptoParent: (position: NodePosition) => void;
    }
}

export interface SelectedPosition {
    startLine: number;
    startColumn: number;
}

export interface FunctionProperties {
    overlayId: string;
    overlayNode: HTMLDivElement;
    functionNode: STNode;
    hasWorker: boolean;
    viewMode: ViewMode;
}
