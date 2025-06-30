
import { ExtendedLangClient } from './core';
import { createMachine, assign, interpret } from 'xstate';
import { activateBallerina } from './extension';
import { EVENT_TYPE, SyntaxTree, History, HistoryEntry, MachineStateValue, STByRangeRequest, SyntaxTreeResponse, UndoRedoManager, VisualizerLocation, webviewReady, MACHINE_VIEW, DIRECTORY_MAP, SCOPE, ProjectStructureResponse, ArtifactData, ProjectStructureArtifactResponse } from "@wso2/ballerina-core";
import { fetchAndCacheLibraryData } from './features/library-browser';
import { VisualizerWebview } from './views/visualizer/webview';
import { commands, extensions, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { notifyCurrentWebview, RPCLayer } from './RPCLayer';
import { generateUid, getComponentIdentifier, getNodeByIndex, getNodeByName, getNodeByUid, getView } from './utils/state-machine-utils';
import * as path from 'path';
import * as fs from 'fs';
import { extension } from './BalExtensionContext';
import { BiDiagramRpcManager } from './rpc-managers/bi-diagram/rpc-manager';
import { AIStateMachine } from './views/ai-panel/aiMachine';
import { StateMachinePopup } from './stateMachinePopup';
import { checkIsBallerina, checkIsBI, fetchScope, getOrgPackageName } from './utils';
import { buildProjectArtifactsStructure } from './utils/project-artifacts';

interface MachineContext extends VisualizerLocation {
    langClient: ExtendedLangClient | null;
    isBISupported: boolean;
    errorCode: string | null;
}

export let history: History;
export let undoRedoManager: UndoRedoManager;

const stateMachine = createMachine<MachineContext>(
    {
        /** @xstate-layout N4IgpgJg5mDOIC5QDUCWsCuBDANqgXmAE4DEASgKIDKFAKgPq0Dy9FAGrRQHJUCSTXepQCCAEQCaAbQAMAXUSgADgHtYqAC6plAOwUgAnogC0ARgDsAVgB0AZgvSHANhPS7Ji44BMAGhAAPRHsAFgBfEN80TFwCYitUbQ1UaMISCB0wOO0AN2UAawzI7DxCIkzE5LAEeJyAYyxNHRlZJr0VNQbdJH9ETyCgqwAOO2legE4gxwtLTxtfQwQTT1HpW1G18aCLAaCZsIj0IpjS+PLisBJiImVSxRx6gDNrgFsrQorjhM0KquzlOo6mi0um1Ejo9AEEL1+kN7GMJlMLDM5sYTHYrI5LA4bNILOYpgM9iA3mdSlgaposvUwAAZKipdKZHL5V4Hd5WMkUqm0n61epabSAuStVSgzqgCF2UZWIJmTyIkwDcYDcxBZELGzjaVjUYWUbbbEmUaE4lHdnk1CU9Q0umXa5WW4PZ4sqIks2cq3c6p-PmNORApQijrgxCS6Wy+WKoLKsyqgyIExBPXSxNrSwuBXSAnhIms104WAUIhXUiUWhkKRC4GB-nBhYDTxWQ2LMwKpUqnxx9WanYp3X66SG42501gPxW7RqHRkMBYCD6EhMAAK3HoyF4FAA6v6QCCg10Ib0BtLhjYXPZpMsBo41QmLNZPAMY2tXI4caMzEOXaasqgwAB3YRzSyDIf3-XhPnpbQMi9ZkTRKKxQIAoCQN-P9wI0HlvQBP1KwDdoay6eZz2ldYBgsbFT0TCxfAlcwrA8R8PBcNwPE-Q54MQwCKQyP8wAAIzQf9qWUWd4igSDoN+WDhw41CuItHj+MEv9hNE7QoEw-5+UFeQq3wsF9x6bZ6McRjnFcXEPDVTYGxTPVyNcBMdTYtlOOQqxeIE1DVIgSAJMZPIChk2I3O4jylO8kTfIgTSfQFHDdLw0VayWBshkxUZ3ERMwbD6azpH6OyyIopyLBc11QoUhDUOnWd5yXFc103bddwI8UelPVYbEsbFcUsMwBjVO8j1y7q7BKqjyu-OT3MQ2q5xIJqN3oABVRdRGETgWurAz2shTqNW6hy+vxNVHEmWxHyjPUBmkAavCm2T-3k4Dqv-eb5wAMV4akKFYUReFobb9LFbp9pMLqepxPEBrVMxZWPRY+k2bZdmzOCQpmsLEIoCBEnUkgKABhhRAEChgeSwz9scKwzFGI7NnhxwbAxDt5kfKUZTsl83w-QltGUXz4C6DGiGFEHayMUZr07IxPGZqwRnPZYJnfPoyvR4KPlOGJxcpvbTClSZegGs8FTlDEhqjEi1mKxzJs1r94I5C0uSoPW9wNw10URGVlWh+sPDMOHsUbFMr3rZYH1CR32NifNC2LD22rBw2fZN-3cUDy3O0yiG6dtmFEzumxHtiUdx0nbQPuT3bU+942-bN7Pg87FwJisTwn2WRwgm6uU+f2J3Mee5Da9BiEjCjNVTxp+sUxsB8KMHnNh9KSrXsQ9D1HH2tpCGhwbfsibnNj1ysaqzzlJ8sTd6p-fO1MhsnL1J+o+2Mv14v16r8i2dIDvntYyUZHymRsGRFszhZidgGLAzuSMBo9nsCzT+b0kLYxqjOOcgCwYP3mO3awfRbY3TuleTwqCN4oX-LjfGUAcEQjwfGcwUpRjak8CYRw0sCqODCGEIAA */
        id: "Visualizer",
        initial: 'initialize',
        predictableActionArguments: true,
        context: {
            langClient: null,
            errorCode: null,
            isBISupported: false,
            view: MACHINE_VIEW.Overview
        },
        on: {
            RESET_TO_EXTENSION_READY: {
                target: "extensionReady",
            },
            UPDATE_PROJECT_STRUCTURE: {
                actions: [
                    assign({
                        projectStructure: (context, event) => event.payload,
                    }),
                    () => {
                        commands.executeCommand("BI.project-explorer.refresh");
                    }
                ]
            },
            UPDATE_PROJECT_LOCATION: {
                actions: [
                    assign({
                        documentUri: (context, event) => event.viewLocation.documentUri ? event.viewLocation.documentUri : context.documentUri,
                        position: (context, event) => event.viewLocation.position ? event.viewLocation.position : context.position,
                        identifier: (context, event) => event.viewLocation.identifier ? event.viewLocation.identifier : context.identifier,
                    })
                ]
            }
        },
        states: {
            initialize: {
                invoke: {
                    src: checkForProjects,
                    onDone: {
                        target: "activateLS",
                        actions: assign({
                            isBI: (context, event) => event.data.isBI,
                            projectUri: (context, event) => event.data.projectPath,
                            scope: (context, event) => event.data.scope,
                            org: (context, event) => event.data.orgName,
                            package: (context, event) => event.data.packageName,
                        })
                    },
                    onError: {
                        target: "activateLS"
                    }
                }
            },
            activateLS: {
                invoke: {
                    src: 'activateLanguageServer',
                    onDone: {
                        target: "fetchProjectStructure",
                        actions: assign({
                            langClient: (context, event) => event.data.langClient,
                            isBISupported: (context, event) => event.data.isBISupported
                        })
                    },
                    onError: {
                        target: "lsError"
                    }
                }
            },
            fetchProjectStructure: {
                invoke: {
                    src: 'registerProjectArtifactsStructure',
                    onDone: {
                        target: "extensionReady",
                        actions: assign({
                            projectStructure: (context, event) => event.data.projectStructure
                        })
                    },
                    onError: {
                        target: "lsError"
                    }
                }
            },
            lsError: {
                on: {
                    RETRY: "initialize"
                }
            },
            extensionReady: {
                on: {
                    OPEN_VIEW: {
                        target: "viewActive",
                        actions: assign({
                            view: (context, event) => event.viewLocation.view,
                            documentUri: (context, event) => event.viewLocation.documentUri,
                            position: (context, event) => event.viewLocation.position,
                            identifier: (context, event) => event.viewLocation.identifier,
                            serviceType: (context, event) => event.viewLocation.serviceType,
                            type: (context, event) => event.viewLocation?.type,
                            isGraphql: (context, event) => event.viewLocation?.isGraphql,
                            metadata: (context, event) => event.viewLocation?.metadata,
                            addType: (context, event) => event.viewLocation?.addType
                        })
                    }
                }
            },
            viewActive: {
                initial: "viewInit",
                states: {
                    viewInit: {
                        invoke: {
                            src: 'openWebView',
                            onDone: {
                                target: "webViewLoading"
                            },
                        }
                    },
                    webViewLoading: {
                        invoke: {
                            src: 'findView', // NOTE: We only find the view and indentifer from this state as we already have the position and the file URL
                            onDone: {
                                target: "webViewLoaded"
                            }
                        }
                    },
                    webViewLoaded: {
                        invoke: {
                            src: 'showView',
                            onDone: {
                                target: "viewReady",
                                actions: assign({
                                    view: (context, event) => event.data.view,
                                    identifier: (context, event) => event.data.identifier,
                                    position: (context, event) => event.data.position,
                                    syntaxTree: (context, event) => event.data.syntaxTree,
                                    focusFlowDiagramView: (context, event) => event.data.focusFlowDiagramView
                                })
                            }
                        }
                    },
                    viewReady: {
                        on: {
                            OPEN_VIEW: {
                                target: "viewInit",
                                actions: assign({
                                    view: (context, event) => event.viewLocation.view,
                                    documentUri: (context, event) => event.viewLocation.documentUri,
                                    position: (context, event) => event.viewLocation.position,
                                    identifier: (context, event) => event.viewLocation.identifier,
                                    serviceType: (context, event) => event.viewLocation.serviceType,
                                    type: (context, event) => event.viewLocation?.type,
                                    isGraphql: (context, event) => event.viewLocation?.isGraphql,
                                    metadata: (context, event) => event.viewLocation?.metadata,
                                    addType: (context, event) => event.viewLocation?.addType
                                })
                            },
                            VIEW_UPDATE: {
                                target: "webViewLoaded",
                                actions: assign({
                                    documentUri: (context, event) => event.viewLocation.documentUri,
                                    position: (context, event) => event.viewLocation.position,
                                    view: (context, event) => event.viewLocation.view,
                                    identifier: (context, event) => event.viewLocation.identifier,
                                    serviceType: (context, event) => event.viewLocation.serviceType,
                                    type: (context, event) => event.viewLocation?.type,
                                    isGraphql: (context, event) => event.viewLocation?.isGraphql,
                                    addType: (context, event) => event.viewLocation?.addType
                                })
                            },
                            FILE_EDIT: {
                                target: "viewEditing"
                            },
                        }
                    },
                    viewEditing: {
                        on: {
                            EDIT_DONE: {
                                target: "viewReady",
                            }
                        }
                    }
                }
            }
        }
    }, {
    services: {
        activateLanguageServer: (context, event) => {
            return new Promise(async (resolve, reject) => {
                try {
                    commands.executeCommand('setContext', 'BI.status', 'loadingLS');
                    const ls = await activateBallerina();
                    fetchAndCacheLibraryData();
                    AIStateMachine.initialize();
                    StateMachinePopup.initialize();
                    commands.executeCommand('setContext', 'BI.status', 'loadingDone');
                    if (!ls.biSupported) {
                        commands.executeCommand('setContext', 'BI.status', 'updateNeed');
                    }
                    resolve({ langClient: ls.langClient, isBISupported: ls.biSupported });
                } catch (error) {
                    throw new Error("LS Activation failed", error);
                }
            });
        },
        registerProjectArtifactsStructure: (context, event) => {
            return new Promise(async (resolve, reject) => {
                try {
                    // If the project uri is not set, we don't need to build the project structure
                    if (context.projectUri) {

                        // Add a 2 second delay before registering artifacts
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        // Register the event driven listener to get the artifact changes
                        context.langClient.registerPublishArtifacts();
                        // Initial Project Structure
                        const projectStructure = await buildProjectArtifactsStructure(context.projectUri, context.langClient);
                        resolve({ projectStructure });
                    } else {
                        resolve({ projectStructure: undefined });
                    }
                } catch (error) {
                    resolve({ projectStructure: undefined });
                }
            });
        },
        openWebView: (context, event) => {
            // Get context values from the project storage so that we can restore the earlier state when user reopens vscode
            return new Promise((resolve, reject) => {
                if (!VisualizerWebview.currentPanel) {
                    VisualizerWebview.currentPanel = new VisualizerWebview();
                    RPCLayer._messenger.onNotification(webviewReady, () => {
                        history = new History();
                        undoRedoManager = new UndoRedoManager();
                        const webview = VisualizerWebview.currentPanel?.getWebview();
                        if (webview && (context.isBI || context.view === MACHINE_VIEW.BIWelcome)) {
                            const biExtension = extensions.getExtension('wso2.ballerina-integrator');
                            webview.iconPath = {
                                light: Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', biExtension ? 'light-icon.svg' : 'ballerina.svg')),
                                dark: Uri.file(path.join(extension.context.extensionPath, 'resources', 'icons', biExtension ? 'dark-icon.svg' : 'ballerina-inverse.svg'))
                            };
                        }
                        resolve(true);
                    });

                } else {
                    VisualizerWebview.currentPanel!.getWebview()?.reveal();
                    resolve(true);
                }
            });
        },
        findView(context, event): Promise<void> {
            return new Promise(async (resolve, reject) => {
                if (!context.view && context.langClient) {
                    if (!context.position || ("groupId" in context.position)) {
                        history.push({ location: { view: MACHINE_VIEW.Overview, documentUri: context.documentUri } });
                        return resolve();
                    }
                    const view = await getView(context.documentUri, context.position, context?.projectUri);
                    history.push(view);
                    return resolve();
                } else {
                    history.push({
                        location: {
                            view: context.view,
                            documentUri: context.documentUri,
                            position: context.position,
                            identifier: context.identifier,
                            type: context?.type,
                            isGraphql: context?.isGraphql,
                            addType: context?.addType
                        }
                    });
                    return resolve();
                }
            });
        },
        showView(context, event): Promise<VisualizerLocation> {
            return new Promise(async (resolve, reject) => {
                StateMachinePopup.resetState();
                const selectedEntry = getLastHistory();
                if (!context.langClient) {
                    if (!selectedEntry) {
                        return resolve({ view: MACHINE_VIEW.Overview, documentUri: context.documentUri });
                    }
                    return resolve({ ...selectedEntry.location, view: selectedEntry.location.view ? selectedEntry.location.view : MACHINE_VIEW.Overview });
                }

                if (selectedEntry && selectedEntry.location.view === MACHINE_VIEW.ERDiagram) {
                    return resolve(selectedEntry.location);
                }

                const defaultLocation = {
                    documentUri: context.documentUri,
                    position: undefined
                };
                const {
                    location = defaultLocation,
                    uid
                } = selectedEntry ?? {};

                const { documentUri, position } = location;

                const node = documentUri && await StateMachine.langClient().getSyntaxTree({
                    documentIdentifier: {
                        uri: Uri.file(documentUri).toString()
                    }
                }) as SyntaxTree;

                if (!selectedEntry?.location.view) {
                    return resolve({ view: MACHINE_VIEW.Overview, documentUri: context.documentUri });
                }

                let selectedST;

                if (node?.parseSuccess) {
                    const fullST = node.syntaxTree;
                    if (!uid && position) {
                        const generatedUid = generateUid(position, fullST);
                        selectedST = getNodeByUid(generatedUid, fullST);
                        if (generatedUid) {
                            history.updateCurrentEntry({
                                ...selectedEntry,
                                location: {
                                    ...selectedEntry.location,
                                    position: selectedST.position,
                                    syntaxTree: selectedST
                                },
                                uid: generatedUid
                            });
                        } else {
                            // show identification failure message
                        }
                    }

                    if (uid && position) {
                        selectedST = getNodeByUid(uid, fullST);

                        if (!selectedST) {
                            const nodeWithUpdatedUid = getNodeByName(uid, fullST);
                            selectedST = nodeWithUpdatedUid[0];

                            if (selectedST) {
                                history.updateCurrentEntry({
                                    ...selectedEntry,
                                    location: {
                                        ...selectedEntry.location,
                                        position: selectedST.position,
                                        syntaxTree: selectedST
                                    },
                                    uid: nodeWithUpdatedUid[1]
                                });
                            } else {
                                const nodeWithUpdatedUid = getNodeByIndex(uid, fullST);
                                selectedST = nodeWithUpdatedUid[0];

                                if (selectedST) {
                                    history.updateCurrentEntry({
                                        ...selectedEntry,
                                        location: {
                                            ...selectedEntry.location,
                                            identifier: getComponentIdentifier(selectedST),
                                            position: selectedST.position,
                                            syntaxTree: selectedST
                                        },
                                        uid: nodeWithUpdatedUid[1]
                                    });
                                } else {
                                    // show identification failure message
                                }
                            }
                        } else {
                            history.updateCurrentEntry({
                                ...selectedEntry,
                                location: {
                                    ...selectedEntry.location,
                                    position: selectedST.position,
                                    syntaxTree: selectedST
                                }
                            });
                        }
                    }
                    undoRedoManager.updateContent(documentUri, node?.syntaxTree?.source);
                }
                const lastView = getLastHistory().location;
                return resolve(lastView);
            });
        }
    }
});

// Create a service to interpret the machine
const stateService = interpret(stateMachine);

function startMachine(): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
        stateService.start().onTransition((state) => {
            if (state.value === "extensionReady") {
                resolve();
            }
        });
    });
}

// Define your API as functions
export const StateMachine = {
    initialize: async () => await startMachine(),
    service: () => { return stateService; },
    context: () => { return stateService.getSnapshot().context; },
    langClient: () => { return stateService.getSnapshot().context.langClient; },
    state: () => { return stateService.getSnapshot().value as MachineStateValue; },
    setEditMode: () => { stateService.send({ type: EVENT_TYPE.FILE_EDIT }); },
    setReadyMode: () => { stateService.send({ type: EVENT_TYPE.EDIT_DONE }); },
    isReady: () => {
        const state = stateService.getSnapshot().value;
        return typeof state === 'object' && 'viewActive' in state && state.viewActive === "viewReady";
    },
    sendEvent: (eventType: EVENT_TYPE) => { stateService.send({ type: eventType }); },
    updateProjectStructure: (payload: ProjectStructureResponse) => { stateService.send({ type: "UPDATE_PROJECT_STRUCTURE", payload }); },
    resetToExtensionReady: () => {
        stateService.send({ type: 'RESET_TO_EXTENSION_READY' });
    },
};

export function openView(type: EVENT_TYPE, viewLocation: VisualizerLocation, resetHistory = false) {
    if (resetHistory) {
        StateMachine.setReadyMode();
        history?.clear();
    }
    extension.hasPullModuleResolved = false;
    extension.hasPullModuleNotification = false;
    stateService.send({ type: type, viewLocation: viewLocation });
}

export function updateView(refreshTreeView?: boolean) {
    let lastView = getLastHistory();
    // Step over to the next location if the last view is skippable
    if (!refreshTreeView && lastView?.location.view.includes("SKIP")) {
        history.pop(); // Remove the last entry
        lastView = getLastHistory(); // Get the new last entry
    }
    stateService.send({ type: "VIEW_UPDATE", viewLocation: lastView ? lastView.location : { view: "Overview" } });
    if (refreshTreeView) {
        buildProjectArtifactsStructure(StateMachine.context().projectUri, StateMachine.langClient(), true);
    }
    notifyCurrentWebview();
}

function getLastHistory() {
    const historyStack = history?.get();
    return historyStack?.[historyStack?.length - 1];
}

async function checkForProjects(): Promise<{ isBI: boolean, projectPath: string, scope?: SCOPE }> {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders) {
        return { isBI: false, projectPath: '' };
    }

    if (workspaceFolders.length > 1) {
        return await handleMultipleWorkspaces(workspaceFolders);
    }

    return await handleSingleWorkspace(workspaceFolders[0].uri);
}

async function handleMultipleWorkspaces(workspaceFolders: readonly WorkspaceFolder[]) {
    const balProjects = workspaceFolders.filter(folder => checkIsBallerina(folder.uri));

    if (balProjects.length > 1) {
        const projectPaths = balProjects.map(folder => folder.uri.fsPath);
        let selectedProject = await window.showQuickPick(projectPaths, {
            placeHolder: 'Select a project to load the WSO2 Integrator'
        });

        if (!selectedProject) {
            // Pick the first project if the user cancels the selection
            selectedProject = projectPaths[0];
        }

        const isBI = checkIsBI(Uri.file(selectedProject));
        const scope = isBI && fetchScope(Uri.file(selectedProject));
        const { orgName, packageName } = getOrgPackageName(selectedProject);
        setBIContext(isBI);
        return { isBI, projectPath: selectedProject, scope, orgName, packageName };
    } else if (balProjects.length === 1) {
        const isBI = checkIsBI(balProjects[0].uri);
        const scope = isBI && fetchScope(balProjects[0].uri);
        const { orgName, packageName } = getOrgPackageName(balProjects[0].uri.fsPath);
        setBIContext(isBI);
        return { isBI, projectPath: balProjects[0].uri.fsPath, scope, orgName, packageName };
    }

    return { isBI: false, projectPath: '' };
}

async function handleSingleWorkspace(workspaceURI: any) {
    const isBallerina = checkIsBallerina(workspaceURI);
    const isBI = isBallerina && checkIsBI(workspaceURI);
    const scope = fetchScope(workspaceURI);
    const projectPath = isBallerina ? workspaceURI.fsPath : "";
    const { orgName, packageName } = getOrgPackageName(projectPath);

    setBIContext(isBI);
    if (!isBI) {
        console.error("No BI enabled workspace found");
    }

    return { isBI, projectPath, scope, orgName, packageName  };
}

function setBIContext(isBI: boolean) {
    commands.executeCommand('setContext', 'isBIProject', isBI);
}
