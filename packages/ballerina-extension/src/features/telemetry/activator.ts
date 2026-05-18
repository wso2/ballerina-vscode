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

import { BallerinaExtension, ExtendedLangClient, TelemetryTracker } from "../../core";
import { debug } from "../../utils";
import { window } from "vscode";
import {
    CMP_EDITOR_SUPPORT, getMessageObject, getTelemetryProperties, sendTelemetryEvent, TM_ERROR_LANG_SERVER,
    TM_EVENT_EDIT_DIAGRAM, TM_EVENT_EDIT_SOURCE, TM_EVENT_KILL_TERMINAL, TM_FEATURE_USAGE_LANG_SERVER
} from ".";

const schedule = require('node-schedule');

// Language server telemetry event types
const TM_EVENT_TYPE_ERROR = "ErrorTelemetryEvent";
const TM_EVENT_TYPE_FEATURE_USAGE = "FeatureUsageTelemetryEvent";

export function activate(ballerinaExtInstance: BallerinaExtension) {
    const reporter = ballerinaExtInstance.telemetryReporter;
    const langClient = <ExtendedLangClient>ballerinaExtInstance.langClient;

    // Start listening telemtry events from language server
    langClient.onNotification('telemetry/event', async (event: LSTelemetryEvent) => {
        let props: { [key: string]: string; };
        switch (event.type) {
            case TM_EVENT_TYPE_ERROR:
                const errorEvent: LSErrorTelemetryEvent = <LSErrorTelemetryEvent>event;
                props = await getTelemetryProperties(ballerinaExtInstance, event.component,
                    getMessageObject(TM_EVENT_TYPE_ERROR));
                props["ballerina.langserver.error.description"] = errorEvent.message;
                props["ballerina.langserver.error.stacktrace"] = errorEvent.errorStackTrace;
                props["ballerina.langserver.error.message"] = errorEvent.errorMessage;
                // TODO: Enable once when the language server telemerty complete
                // reporter.sendTelemetryEvent(TM_ERROR_LANG_SERVER, props);
                break;
            case TM_EVENT_TYPE_FEATURE_USAGE:
                const usageEvent: LSFeatureUsageTelemetryEvent = <LSFeatureUsageTelemetryEvent>event;
                props = await getTelemetryProperties(ballerinaExtInstance, event.component,
                    getMessageObject(TM_EVENT_TYPE_FEATURE_USAGE));
                props["ballerina.langserver.feature.name"] = usageEvent.featureName;
                props["ballerina.langserver.feature.class"] = usageEvent.featureClass;
                props["ballerina.langserver.feature.message"] = usageEvent.featureMessage;
                // TODO: Enable once when the language server telemerty complete
                // reporter.sendTelemetryEvent(TM_FEATURE_USAGE_LANG_SERVER, props);
                break;
            default:
                // Do nothing
                break;
        }
    });

    if (ballerinaExtInstance?.getCodeServerContext().codeServerEnv) {
        schedule.scheduleJob('* * * * *', function () {
            debug(`Publish LS client telemetry at ${new Date()}`);
            langClient.pushLSClientTelemetries();
            const telemetryTracker: TelemetryTracker = ballerinaExtInstance.getCodeServerContext().telemetryTracker!;
            if (telemetryTracker.hasTextEdits()) {
                //editor-workspace-edit-source
                sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_EDIT_SOURCE, CMP_EDITOR_SUPPORT);
            }
            if (telemetryTracker.hasDiagramEdits()) {
                //editor-workspace-edit-diagram
                sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_EDIT_DIAGRAM, CMP_EDITOR_SUPPORT);
            }
            telemetryTracker.reset();
        });
    }

    //editor-terminal-kill
    window.onDidCloseTerminal(t => {
        sendTelemetryEvent(ballerinaExtInstance, TM_EVENT_KILL_TERMINAL, '');
    });
}

interface LSTelemetryEvent {
    type: string;
    component: string;
    version: string;
}

interface LSErrorTelemetryEvent extends LSTelemetryEvent {
    message: string;
    errorMessage: string;
    errorStackTrace: string;
}

interface LSFeatureUsageTelemetryEvent extends LSTelemetryEvent {
    featureName: string;
    featureClass: string;
    featureMessage: string;
}
