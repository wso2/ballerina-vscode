
import { ExtendedLangClient } from './core';
import { createMachine, assign, interpret } from 'xstate';
import { activateBallerina } from './extension';
import { EVENT_TYPE, SyntaxTree, History, MachineStateValue, IUndoRedoManager, VisualizerLocation, webviewReady, MACHINE_VIEW, DIRECTORY_MAP, SCOPE, ProjectStructureResponse, ProjectStructureArtifactResponse, CodeData, ProjectDiagnosticsResponse, Type } from "@wso2/ballerina-core";
import { fetchAndCacheLibraryData } from './features/library-browser';
import { VisualizerWebview } from './views/visualizer/webview';
import { commands, extensions, ShellExecution, Task, TaskDefinition, tasks, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { notifyCurrentWebview, RPCLayer } from './RPCLayer';
import { generateUid, getComponentIdentifier, getNodeByIndex, getNodeByName, getNodeByUid, getView } from './utils/state-machine-utils';
import * as path from 'path';
import { extension } from './BalExtensionContext';
import { AIStateMachine } from './views/ai-panel/aiMachine';
import { StateMachinePopup } from './stateMachinePopup';
import {
    checkIsBallerinaPackage,
    checkIsBallerinaWorkspace,
    checkIsBI,
    fetchScope,
    filterPackagePaths,
    getOrgPackageName,
    UndoRedoManager,
    getProjectTomlValues,
    getWorkspaceTomlValues
} from './utils';
import { buildProjectArtifactsStructure } from './utils/project-artifacts';

export interface ProjectMetadata {
    readonly isBI: boolean;
    readonly projectPath: string;
    readonly workspacePath?: string;
    readonly scope?: SCOPE;
    readonly orgName?: string;
    readonly packageName?: string;
}

interface MachineContext extends VisualizerLocation {
    langClient: ExtendedLangClient | null;
    isBISupported: boolean;
    errorCode: string | null;
    dependenciesResolved?: boolean;
}

export let history: History;
export let undoRedoManager: IUndoRedoManager;
let pendingProjectRootUpdateResolvers: Array<() => void> = [];

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
            view: MACHINE_VIEW.Overview,
            dependenciesResolved: false
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
                        // Use queueMicrotask to ensure context is updated before command execution
                        queueMicrotask(() => {
                            commands.executeCommand("BI.project-explorer.refresh");
                        });
                    }
                ]
            },
            UPDATE_PROJECT_ROOT: {
                actions: [
                    assign({
                        projectPath: (context, event) => event.projectPath
                    }),
                    async (context, event) => {
                        await buildProjectArtifactsStructure(event.projectPath, StateMachine.langClient(), true);
                        notifyCurrentWebview();
                        // Resolve the next pending promise waiting for project root update completion
                        pendingProjectRootUpdateResolvers.shift()?.();
                    }
                ]
            },
            UPDATE_PROJECT_LOCATION: {
                actions: [
                    assign({
                        documentUri: (context, event) => event.viewLocation.documentUri ? event.viewLocation.documentUri : context.documentUri,
                        position: (context, event) => event.viewLocation.position ? event.viewLocation.position : context.position,
                        identifier: (context, event) => event.viewLocation.identifier ? event.viewLocation.identifier : context.identifier,
                        addType: (context, event) => event.viewLocation?.addType !== undefined ? event.viewLocation.addType : context?.addType,
                    })
                ]
            },
            SWITCH_PROJECT: {
                target: "switch_project"
            }
        },
        states: {
            switch_project: {
                invoke: {
                    src: checkForProjects,
                    onDone: [
                        {
                            target: "viewActive.viewReady",
                            actions: [
                                assign({
                                    isBI: (context, event) => event.data.isBI,
                                    projectPath: (context, event) => event.data.projectPath,
                                    workspacePath: (context, event) => event.data.workspacePath,
                                    scope: (context, event) => event.data.scope,
                                    org: (context, event) => event.data.orgName,
                                    package: (context, event) => event.data.packageName,
                                }),
                                async (context, event) => {
                                    await buildProjectArtifactsStructure(event.data.projectPath, StateMachine.langClient(), true);
                                    openView(EVENT_TYPE.OPEN_VIEW, { view: MACHINE_VIEW.Overview });
                                    notifyCurrentWebview();
                                }
                            ]
                        }
                    ],
                }
            },
            initialize: {
                invoke: {
                    src: checkForProjects,
                    onDone: [
                        {
                            target: "renderInitialView",
                            cond: (context, event) => event.data && event.data.isBI,
                            actions: assign({
                                isBI: (context, event) => event.data.isBI,
                                projectPath: (context, event) => event.data.projectPath,
                                workspacePath: (context, event) => event.data.workspacePath,
                                scope: (context, event) => event.data.scope,
                                org: (context, event) => event.data.orgName,
                                package: (context, event) => event.data.packageName,
                            })
                        },
                        {
                            target: "activateLS",
                            cond: (context, event) => event.data && event.data.isBI === false,
                            actions: assign({
                                isBI: (context, event) => event.data.isBI,
                                projectPath: (context, event) => event.data.projectPath,
                                workspacePath: (context, event) => event.data.workspacePath,
                                scope: (context, event) => event.data.scope,
                                org: (context, event) => event.data.orgName,
                                package: (context, event) => event.data.packageName,
                            })
                        }
                    ],
                    onError: {
                        target: "activateLS"
                    }
                }
            },
            renderInitialView: {
                invoke: {
                    src: 'openWebView',
                    onDone: {
                        target: "activateLS"
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
                        target: "lsError",
                        actions: () => {
                            console.error("Error occurred while activating Language Server.");
                        }
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
                        target: "lsError",
                        actions: () => {
                            console.error("Error occurred while fetching project structure.");
                        }
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
                            addType: (context, event) => event.viewLocation?.addType,
                            dataMapperMetadata: (context, event) => event.viewLocation?.dataMapperMetadata,
                            artifactInfo: (context, event) => event.viewLocation?.artifactInfo,
                            rootDiagramId: (context, event) => event.viewLocation?.rootDiagramId
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
                            onDone: [
                                {
                                    target: "resolveMissingDependencies",
                                    cond: (context) => !context.dependenciesResolved
                                },
                                {
                                    target: "webViewLoading"
                                }
                            ]
                        }
                    },
                    resolveMissingDependencies: {
                        invoke: {
                            src: 'resolveMissingDependencies',
                            onDone: {
                                target: "webViewLoading",
                                actions: assign({
                                    dependenciesResolved: true
                                })
                            }
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
                                    parentIdentifier: (context, event) => event.data.parentIdentifier,
                                    position: (context, event) => event.data.position,
                                    syntaxTree: (context, event) => event.data.syntaxTree,
                                    focusFlowDiagramView: (context, event) => event.data.focusFlowDiagramView,
                                    dataMapperMetadata: (context, event) => event.data.dataMapperMetadata
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
                                    projectPath: (context, event) => event.viewLocation?.projectPath || context?.projectPath,
                                    package: (context, event) => event.viewLocation?.package,
                                    type: (context, event) => event.viewLocation?.type,
                                    isGraphql: (context, event) => event.viewLocation?.isGraphql,
                                    metadata: (context, event) => event.viewLocation?.metadata,
                                    addType: (context, event) => event.viewLocation?.addType,
                                    dataMapperMetadata: (context, event) => event.viewLocation?.dataMapperMetadata,
                                    artifactInfo: (context, event) => event.viewLocation?.artifactInfo,
                                    rootDiagramId: (context, event) => event.viewLocation?.rootDiagramId
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
                                    addType: (context, event) => event.viewLocation?.addType,
                                    dataMapperMetadata: (context, event) => event.viewLocation?.dataMapperMetadata
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
                    // Register the event driven listener to get the artifact changes
                    context.langClient.registerPublishArtifacts();
                    // If the project uri or workspace path is not set, we don't need to build the project structure
                    if (context.projectPath || context.workspacePath) {

                        // Add a 2 second delay before registering artifacts
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        // Initial Project Structure
                        const projectStructure = await buildProjectArtifactsStructure(context.projectPath, context.langClient);
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
                    extension.ballerinaExtInstance.setContext(extension.context);
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
        resolveMissingDependencies: (context, event) => {
            return new Promise(async (resolve, reject) => {
                if (context?.projectPath) {
                    const diagnostics: ProjectDiagnosticsResponse = await StateMachine.langClient().getProjectDiagnostics({
                        projectRootIdentifier: {
                            uri: Uri.file(context.projectPath).toString(),
                        }
                    });

                    // Check if there are any "cannot resolve module" diagnostics
                    const hasMissingModuleDiagnostics = diagnostics.errorDiagnosticMap &&
                        Object.values(diagnostics.errorDiagnosticMap).some(fileDiagnostics =>
                            fileDiagnostics.some(diagnostic =>
                                diagnostic.message.includes('cannot resolve module')
                            )
                        );

                    // Only proceed with build if there are missing module diagnostics
                    if (!hasMissingModuleDiagnostics) {
                        resolve(true);
                        return;
                    }

                    const taskDefinition: TaskDefinition = {
                        type: 'shell',
                        task: 'run'
                    };

                    let buildCommand = 'bal build';

                    const config = workspace.getConfiguration('ballerina');
                    const ballerinaHome = config.get<string>('home');
                    if (ballerinaHome) {
                        buildCommand = path.join(ballerinaHome, 'bin', buildCommand);
                    }

                    // Use the current process environment which should have the updated PATH
                    const execution = new ShellExecution(buildCommand, { env: process.env as { [key: string]: string } });

                    if (!workspace.workspaceFolders || workspace.workspaceFolders.length === 0) {
                        resolve(true);
                        return;
                    }


                    const task = new Task(
                        taskDefinition,
                        workspace.workspaceFolders![0],
                        'Ballerina Build',
                        'ballerina',
                        execution
                    );

                    try {
                        const taskExecution = await tasks.executeTask(task);

                        // Wait for task completion
                        await new Promise<void>((taskResolve) => {
                            // Listen for task completion
                            const disposable = tasks.onDidEndTask((taskEndEvent) => {
                                if (taskEndEvent.execution === taskExecution) {
                                    console.log('Build task completed');

                                    // Close the terminal pane on completion
                                    commands.executeCommand('workbench.action.closePanel');

                                    disposable.dispose();
                                    taskResolve();
                                }
                            });
                        });

                    } catch (error) {
                        window.showErrorMessage(`Failed to build Ballerina package: ${error}`);
                    }
                }

                resolve(true);
            });
        },
        findView(context, event): Promise<void> {
            return new Promise(async (resolve, reject) => {
                const projectTomlValues = await getProjectTomlValues(context.projectPath);
                const packageName = projectTomlValues?.package?.name;
                if (!context.view && context.langClient) {
                    if (!context.position || ("groupId" in context.position)) {
                        history.push({
                            location: {
                                view: MACHINE_VIEW.Overview,
                                documentUri: context.documentUri,
                                package: packageName || context.package
                            }
                        });
                        return resolve();
                    }
                    const view = await getView(context.documentUri, context.position, context?.projectPath);
                    view.location.package = packageName || context.package;
                    view.location.package = packageName || context.package;
                    history.push(view);
                    return resolve();
                } else {
                    history.push({
                        location: {
                            view: context.view,
                            documentUri: context.documentUri,
                            position: context.position,
                            identifier: context.identifier,
                            package: packageName || context.package,
                            type: context?.type,
                            isGraphql: context?.isGraphql,
                            addType: context?.addType,
                            dataMapperMetadata: context?.dataMapperMetadata
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

                if (selectedEntry && (selectedEntry.location.view === MACHINE_VIEW.ERDiagram || selectedEntry.location.view === MACHINE_VIEW.ServiceDesigner || selectedEntry.location.view === MACHINE_VIEW.BIDiagram)) {
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

                // TODO: Refactor this to remove the full ST request
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
    updateProjectRoot: (projectPath: string): Promise<void> => {
        return new Promise<void>((resolve) => {
            pendingProjectRootUpdateResolvers.push(resolve);
            stateService.send({ type: "UPDATE_PROJECT_ROOT", projectPath });
        });
    },
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

    let newLocation: VisualizerLocation = lastView?.location;
    let newLocationFound = false;
    if (lastView && lastView.location?.artifactType && lastView.location?.identifier) {
        newLocation = { ...lastView.location };
        const currentIdentifier = lastView.location?.identifier;
        let currentArtifact: ProjectStructureArtifactResponse;
        let targetedArtifactType = lastView.location?.artifactType;

        if (targetedArtifactType === DIRECTORY_MAP.RESOURCE) {
            // If the artifact type is resource, we need to target the service
            targetedArtifactType = DIRECTORY_MAP.SERVICE;
        }

        // These changes will be revisited in the revamp
        StateMachine.context().projectStructure.directoryMap[targetedArtifactType].forEach((artifact) => {
            if (artifact.id === currentIdentifier || artifact.name === currentIdentifier) {
                currentArtifact = artifact;
            }
            // Check if artifact has resources and find within those
            if (artifact.resources && artifact.resources.length > 0) {
                const resource = artifact.resources.find((resource) => resource.id === currentIdentifier || resource.name === currentIdentifier);
                if (resource) {
                    currentArtifact = resource;
                }
            }
        });

        const newPosition = currentArtifact?.position || lastView.location.position;
        newLocation = { ...lastView.location, position: newPosition };

        history.updateCurrentEntry({
            ...lastView,
            location: newLocation
        });
        newLocationFound = true;
    }

    // Check for service class model in the new location
    if (!newLocationFound && lastView?.location?.type) {
        let currentArtifact: ProjectStructureArtifactResponse;
        StateMachine.context().projectStructure.directoryMap[DIRECTORY_MAP.TYPE].forEach((artifact) => {
            if (artifact.id === lastView.location.type.name || artifact.name === lastView.location.type.name) {
                currentArtifact = artifact;
            }
        });
        const newPosition = currentArtifact?.position || lastView.location.position;
        const updatedType: Type = {
            ...lastView.location.type,
            codedata: {
                ...lastView.location.type.codedata,
                lineRange: {
                    ...lastView.location.type.codedata.lineRange,
                    startLine: { line: newPosition.startLine, offset: newPosition.startColumn },
                    endLine: { line: newPosition.endLine, offset: newPosition.endColumn }
                }
            }
        };

        newLocation = { ...lastView.location, position: newPosition, type: updatedType };
        history.updateCurrentEntry({
            ...lastView,
            location: newLocation
        });

    }


    stateService.send({ type: "VIEW_UPDATE", viewLocation: lastView ? newLocation : { view: "Overview" } });
    if (refreshTreeView) {
        buildProjectArtifactsStructure(StateMachine.context().projectPath, StateMachine.langClient(), true);
    }
    notifyCurrentWebview();
}

export function updateDataMapperView(codedata?: CodeData, variableName?: string): void {
    const dataMapperMetadata = {
        codeData: codedata,
        name: variableName
    };

    if (StateMachinePopup.isActive()) {
        // Update popup context when data mapper is in popup view
        const popupLocation = StateMachinePopup.context();
        popupLocation.dataMapperMetadata = dataMapperMetadata;

        StateMachinePopup.sendEvent(EVENT_TYPE.VIEW_UPDATE, popupLocation);
    } else {
        // Update main view history when data mapper is in main view
        const lastView = getLastHistory();
        if (lastView && lastView.location) {
            lastView.location.dataMapperMetadata = dataMapperMetadata;
            stateService.send({ type: EVENT_TYPE.VIEW_UPDATE, viewLocation: lastView.location });
        }
    }

    notifyCurrentWebview();
}


function getLastHistory() {
    const historyStack = history?.get();
    return historyStack?.[historyStack?.length - 1];
}

async function checkForProjects(): Promise<ProjectMetadata> {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders) {
        return { isBI: false, projectPath: '' };
    }

    if (workspaceFolders.length > 1) {
        return await handleMultipleWorkspaceFolders(workspaceFolders);
    }

    return await handleSingleWorkspaceFolder(workspaceFolders[0].uri);
}

async function handleMultipleWorkspaceFolders(workspaceFolders: readonly WorkspaceFolder[]): Promise<ProjectMetadata> {
    const balProjectChecks = await Promise.all(
        workspaceFolders.map(async folder => ({
            folder,
            isBallerinaPackage: await checkIsBallerinaPackage(folder.uri)
        }))
    );
    const balProjects = balProjectChecks
        .filter(result => result.isBallerinaPackage)
        .map(result => result.folder);

    if (balProjects.length > 1 && workspace.workspaceFile?.scheme === "file") {
        // Show notification to guide users to use Ballerina workspaces instead of VSCode workspaces
        window.showInformationMessage(
            'Multiple Ballerina projects detected in VSCode workspace. Please use Ballerina workspaces for better project management and native support.',
            'Learn More'
        ).then(selection => {
            if (selection === 'Learn More') {
                // TODO: Add a guide on how to use Ballerina workspaces
                // Open documentation or guide about Ballerina workspaces
                commands.executeCommand('vscode.open', Uri.parse('https://ballerina.io/learn/organize-ballerina-code/'));
            }
        });

        // Return empty result to indicate no project should be loaded
        return { isBI: false, projectPath: '' };
    } else if (balProjects.length === 1) {
        const isBI = checkIsBI(balProjects[0].uri);
        const scope = isBI && fetchScope(balProjects[0].uri);
        const { orgName, packageName } = getOrgPackageName(balProjects[0].uri.fsPath);
        setBIContext(isBI);
        return { isBI, projectPath: balProjects[0].uri.fsPath, scope, orgName, packageName };
    }

    return { isBI: false, projectPath: '' };
}

async function handleSingleWorkspaceFolder(workspaceURI: Uri): Promise<ProjectMetadata> {
    const isBallerinaWorkspace = await checkIsBallerinaWorkspace(workspaceURI);

    if (isBallerinaWorkspace) {
        // A workaround for supporting multiple packages in a workspace
        // TODO: Once the artifacts API is updated to support multiple packages and the new API for detecting the
        // most appropriate package to load the WSO2 Integrator is implemented, this workaround can be removed
        // Ref: https://github.com/wso2/product-ballerina-integrator/issues/1465
        const workspaceTomlValues = await getWorkspaceTomlValues(workspaceURI.fsPath);

        if (!workspaceTomlValues) {
            return { isBI: false, projectPath: '' };
        }

        const packages = await filterPackagePaths(workspaceTomlValues.workspace.packages, workspaceURI.fsPath);
        let targetPackage;

        if (packages.length > 1) {
            targetPackage = await window.showQuickPick(packages, {
                title: 'Select Package for WSO2 Integrator: BI',
                placeHolder: 'Choose a package from your workspace to load in BI mode',
                ignoreFocusOut: true
            });
        } else if (packages.length === 1) {
            targetPackage = packages[0];
        }

        if (targetPackage) {
            const packagePath = path.isAbsolute(targetPackage)
                ? targetPackage
                : path.join(workspaceURI.fsPath, targetPackage);
            const packageUri = Uri.file(packagePath);

            const isBallerinaPackage = await checkIsBallerinaPackage(packageUri);
            const isBI = isBallerinaPackage && checkIsBI(packageUri);
            const scope = fetchScope(packageUri);
            const projectPath = isBallerinaPackage ? packagePath : "";
            const { orgName, packageName } = getOrgPackageName(projectPath);

            setBIContext(isBI);
            if (!isBI) {
                console.error("No BI enabled workspace found");
            }

            return { isBI, projectPath, workspacePath: workspaceURI.fsPath, scope, orgName, packageName };
        } else {
            return { isBI: false, projectPath: '' };
        }
    } else {
        const isBallerinaPackage = await checkIsBallerinaPackage(workspaceURI);
        const isBI = isBallerinaPackage && checkIsBI(workspaceURI);
        const scope = fetchScope(workspaceURI);
        const projectPath = isBallerinaPackage ? workspaceURI.fsPath : "";
        const { orgName, packageName } = getOrgPackageName(projectPath);

        setBIContext(isBI);
        if (!isBI) {
            console.error("No BI enabled workspace found");
        }

        return { isBI, projectPath, scope, orgName, packageName };
    }
}
function setBIContext(isBI: boolean) {
    commands.executeCommand('setContext', 'isBIProject', isBI);
}
