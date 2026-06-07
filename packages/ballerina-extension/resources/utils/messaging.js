class WebViewRPCHandler {

    constructor(methods) {
        this._sequence = 1;
        this._callbacks = {};
        this.methods = methods || [];
        this._onRemoteMessage = this._onRemoteMessage.bind(this);
        window.addEventListener('message', this._onRemoteMessage);
    }

    _onRemoteMessage(evt) {
        const msg = evt.data;
        if (msg.id) {
            const methodName = msg.methodName;
            // this is a request from remote
            const method = this.methods.find(method => method.methodName === methodName);
            if (method) {
                method.handler(msg.arguments)
                    .then((response) => {
                        vscode.postMessage({
                            originId: msg.id,
                            response: JSON.stringify(response)
                        });
                    });
            }
        } else if (msg.originId) {
            // this is a response from remote
            const seqId = msg.originId;
            if (this._callbacks[seqId]) {
                this._callbacks[seqId](JSON.parse(msg.response));
                delete this._callbacks[seqId];
            }
        }
    }

    addMethod(methodName, handler = () => {}) {
        this.methods.push({
            methodName,
            handler
        });
    }

    invokeRemoteMethod(methodName, args, onReply = () => {}) {
        const msg = {
            id: this._sequence,
            methodName: methodName,
            arguments: args,
        }
        this._callbacks[this._sequence] = onReply;
        vscode.postMessage(msg);
        this._sequence++;
    }

    dispose() {
        window.removeEventListener('message', this._onRemoteMessage);
    }
}

var webViewRPCHandler = new WebViewRPCHandler([]);

var vscode = acquireVsCodeApi();


function getLangClient() {
    return {
        isInitialized: true,
        getProjectAST: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getProjectAST', [params.sourceRoot], (resp) => {
                    consoleLog(start, 'getProjectAST');
                    resolve(resp);
                });
            });
        },
        getSyntaxTree: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSyntaxTree', [params], (resp) => {
                    consoleLog(start, 'getSyntaxTree');
                    const unzippedResp = pako.inflate(resp.data, {
                        to: 'string'
                    });
                    resolve(JSON.parse(unzippedResp));
                });
            });
        },
        getBallerinaProjectComponents: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getBallerinaProjectComponents', [params], (resp) => {
                    consoleLog(start, 'getBallerinaProjectComponents');
                    // const unzippedResp = pako.inflate(resp.data, { to: 'string' });
                    // resolve(JSON.parse(unzippedResp));
                    resolve(resp);
                });
            });
        },
        getCompletion: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getCompletion', [params], (resp) => {
                    consoleLog(start, 'getCompletion');
                    resolve(resp);
                });
            });
        },
        getType: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getType', [params], (resp) => {
                    consoleLog(start, 'getType');
                    resolve(resp);
                });
            });
        },
        getDiagnostics: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getDiagnostics', [params], (resp) => {
                    consoleLog(start, 'getDiagnostics');
                    resolve(resp);
                });
            });
        },
        getEndpoints: () => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getEndpoints', [], (resp) => {
                    consoleLog(start, 'getEndpoints');
                    resolve(resp);
                });
            })
        },
        revealRange: (params) => {
            if (params) {
                return new Promise((resolve, _reject) => {
                    const start = new Date();
                    webViewRPCHandler.invokeRemoteMethod(
                        'revealRange',
                        [JSON.stringify(params)],
                        (resp) => {
                            consoleLog(start, 'revealRange');
                            resolve(resp);
                        }
                    );
                })
            }
        },
        goToSource: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod(
                    'goToSource',
                    [JSON.stringify(params)],
                    (resp) => {
                        consoleLog(start, 'goToSource');
                        resolve(resp);
                    }
                );
            })
        },
        getExamples: () => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getExamples', [], (resp) => {
                    consoleLog(start, 'getExamples');
                    resolve(resp.samples);
                });
            })
        },
        getDefinitionPosition: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getDefinitionPosition', [params], (resp) => {
                    consoleLog(start, 'getDefinitionPosition');
                    resolve(resp);
                });
            })
        },
        didOpen: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('didOpen', [params], (resp) => {
                    consoleLog(start, 'didOpen');
                    resolve(resp);
                });
            })
        },
        registerPublishDiagnostics: () => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('registerPublishDiagnostics', [], (resp) => {
                    consoleLog(start, 'registerPublishDiagnostics');
                    resolve(resp);
                });
            })
        },
        didClose: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('didClose', [params], (resp) => {
                    consoleLog(start, 'didClose');
                    resolve(resp);
                });
            })
        },
        didChange: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('didChange', [params], (resp) => {
                    consoleLog(start, 'didChange');
                    resolve(resp);
                });
            })
        },
        definition: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('definition', [params], (resp) => {
                    consoleLog(start, 'definition');
                    resolve(resp);
                });
            })
        },
        syntaxTreeModify: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('syntaxTreeModify', [params], (resp) => {
                    consoleLog(start, 'syntaxTreeModify');
                    resolve(resp);
                });
            })
        },
        getConnectors: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getConnectors', [params], (resp) => {
                    consoleLog(start, 'getConnectors');
                    resolve(resp);
                });
            })
        },
        getTriggers: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getTriggers', [params], (resp) => {
                    consoleLog(start, 'getTriggers');
                    resolve(resp);
                });
            })
        },
        getConnector: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getConnector', [params], (resp) => {
                    consoleLog(start, 'getConnector');
                    resolve(resp);
                });
            })
        },
        getTrigger: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getTrigger', [params], (resp) => {
                    consoleLog(start, 'getTrigger');
                    resolve(resp);
                });
            })
        },
        getRecord: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getRecord', [params], (resp) => {
                    consoleLog(start, 'getRecord');
                    resolve(resp);
                });
            })
        },
        astModify: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('astModify', [params], (resp) => {
                    consoleLog(start, 'astModify');
                    resolve(resp);
                });
            })
        },
        stModify: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('stModify', [params], (resp) => {
                    consoleLog(start, 'stModify');
                    const unzippedResp = pako.inflate(resp.data, {
                        to: 'string'
                    });
                    resolve(JSON.parse(unzippedResp));
                });
            })
        },
        getSTForFunction: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSTForFunction', [params], (resp) => {
                    consoleLog(start, 'getSTForFunction');
                    const unzippedResp = pako.inflate(resp.data, {
                        to: 'string'
                    });
                    resolve(JSON.parse(unzippedResp));
                });
            })
        },
        triggerModify: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('triggerModify', [params], (resp) => {
                    consoleLog(start, 'triggerModify');
                    resolve(resp);
                });
            })
        },
        getDocumentSymbol: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getDocumentSymbol', [params], (resp) => {
                    consoleLog(start, 'getDocumentSymbol');
                    resolve(resp);
                });
            })
        },
        close: () => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('close', [], (resp) => {
                    consoleLog(start, 'close');
                    resolve(resp);
                });
            })
        },
        getDidOpenParams: () => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getDidOpenParams', [], (resp) => {
                    consoleLog(start, 'getDidOpenParams');
                    resolve(resp);
                });
            })
        },
        getSyntaxTreeFileRange: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSyntaxTreeFileRange', [params], (resp) => {
                    consoleLog(start, 'getSyntaxTreeFileRange');
                    resolve(resp);
                });
            })
        },
        convert: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('convert', [params], (resp) => {
                    consoleLog(start, 'convert');
                    resolve(resp);
                });
            })
        },
        convertXml: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('convertXml', [params], (resp) => {
                    consoleLog(start, 'convertXml');
                    resolve(resp);
                });
            })
        },
        getSTForSingleStatement: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSTForSingleStatement', [params], (resp) => {
                    consoleLog(start, 'getSTForSingleStatement');
                    resolve(resp);
                });
            })
        },
        getSTForExpression: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSTForExpression', [params], (resp) => {
                    consoleLog(start, 'getSTForExpression');
                    resolve(resp);
                });
            })
        },
        getSTForModuleMembers: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSTForModuleMembers', [params], (resp) => {
                    consoleLog(start, 'getSTForModuleMembers');
                    resolve(resp);
                });
            })
        },
        codeAction: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('codeAction', [params], (resp) => {
                    consoleLog(start, 'codeAction');
                    resolve(resp);
                });
            })
        },
        getSTForModulePart: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSTForModulePart', [params], (resp) => {
                    consoleLog(start, 'getSTForModulePart');
                    resolve(resp);
                });
            })
        },
        getSTForResource: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSTForResource', [params], (resp) => {
                    consoleLog(start, 'getSTForResource');
                    resolve(resp);
                });
            })
        },
        getPerfEndpoints: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getPerfEndpoints', [params], (resp) => {
                    consoleLog(start, 'getPerfEndpoints');
                    resolve(resp);
                });
            })
        },
        resolveMissingDependencies: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('resolveMissingDependencies', [params], (resp) => {
                    consoleLog(start, 'resolveMissingDependencies');
                    resolve(resp);
                });
            })
        },
        getExecutorPositions: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getExecutorPositions', [params], (resp) => {
                    consoleLog(start, 'getExecutorPositions');
                    resolve(resp);
                });
            })
        },
        sendTelemetryEvent: (params) => {
            return new Promise((resolve, _reject) => {
                webViewRPCHandler.invokeRemoteMethod(
                    'sendTelemetryEvent',
                    [JSON.stringify(params)],
                    (resp) => {
                        resolve(resp);
                    }
                );
            })
        },
        getNotebookVariables: () => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getNotebookVariables', [], (resp) => {
                    consoleLog(start, 'getNotebookVariables');
                    resolve(resp);
                });
            });
        },
        getSymbolDocumentation: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getSymbolDocumentation', [params], (resp) => {
                    consoleLog(start, 'getSymbolDocumentation');
                    resolve(resp);
                });
            });
        },
        getTypeFromExpression: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getTypeFromExpression', [params], (resp) => {
                    consoleLog(start, 'getTypeFromExpression');
                    resolve(resp);
                });
            });
        },
        getTypeFromSymbol: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getTypeFromSymbol', [params], (resp) => {
                    consoleLog(start, 'getTypeFromSymbol');
                    resolve(resp);
                });
            });
        },
        getTypesFromFnDefinition: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getTypesFromFnDefinition', [params], (resp) => {
                    consoleLog(start, 'getTypesFromFnDefinition');
                    resolve(resp);
                });
            });
        },
        rename: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('rename', [params], (resp) => {
                    consoleLog(start, 'rename');
                    resolve(resp);
                });
            });
        },
        getGraphqlModel: (params) => {
            return new Promise((resolve, _reject) => {
                const start = new Date();
                webViewRPCHandler.invokeRemoteMethod('getGraphqlModel', [params], (resp) => {
                    consoleLog(start, 'getGraphqlModel');
                    resolve(resp);
                });
            });
        }
    }
}

function consoleLog(start, fnName) {
    const end = new Date();
    console.debug(`Frontend - Time taken for ${fnName}: ${end - start}ms`);
}