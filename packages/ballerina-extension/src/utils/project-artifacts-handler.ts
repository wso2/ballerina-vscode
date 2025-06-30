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

import { ProjectStructureArtifactResponse, DIRECTORY_MAP, ArtifactData } from "@wso2/ballerina-core";

// Define the base notification type
interface NotificationType<T> {
    method: string;
}

// Define the notification payload type
interface NotificationPayload {
    data: ProjectStructureArtifactResponse[];
    timestamp: number;
}

// Define the notification type with typed payload
export const ArtifactsUpdated: NotificationType<NotificationPayload> = { method: "artifactsUpdated" };
export const ArtifactsUpdatedWithTimeout: NotificationType<NotificationPayload> = { method: "artifactsUpdatedWithTimeout" };

export class ArtifactNotificationHandler {
    private subscribers: Map<string, Set<(payload: NotificationPayload) => void>>;
    private static instance: ArtifactNotificationHandler;

    private constructor() {
        this.subscribers = new Map();
    }

    public static getInstance(): ArtifactNotificationHandler {
        if (!ArtifactNotificationHandler.instance) {
            ArtifactNotificationHandler.instance = new ArtifactNotificationHandler();
        }
        return ArtifactNotificationHandler.instance;
    }

    // Subscribe with type filtering
    public subscribe(
        notificationType: string,
        artifactData: ArtifactData,
        callback: (payload: NotificationPayload) => void
    ): () => void {
        if (!this.subscribers.has(notificationType)) {
            this.subscribers.set(notificationType, new Set());
        }

        const subscribers = this.subscribers.get(notificationType)!;

        // Create a wrapper callback that filters the data
        const wrappedCallback = (payload: NotificationPayload) => {
            let filteredData = payload.data;
            if (artifactData) {
                filteredData = filteredData.filter(data => data.type === artifactData.artifactType);
                if (artifactData.identifier) {
                    filteredData = filteredData.filter(data => data.name === artifactData.identifier);
                }
            }
            if (filteredData.length > 0) {
                callback({
                    ...payload,
                    data: filteredData
                });
            }
        };

        subscribers.add(wrappedCallback);

        // Return unsubscribe function
        return () => {
            subscribers.delete(wrappedCallback);
            if (subscribers.size === 0) {
                this.subscribers.delete(notificationType);
            }
        };
    }

    // Publish a notification to all subscribers
    public publish(notificationType: string, payload: NotificationPayload): void {
        const subscribers = this.subscribers.get(notificationType);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(payload);
                } catch (error) {
                    console.error(`Error in notification handler for ${notificationType}:`, error);
                }
            });
        }
    }
}
