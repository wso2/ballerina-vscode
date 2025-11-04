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

import * as crypto from 'crypto';

/**
 * Generates a random 16-byte trace ID or span ID as a hex string
 */
function generateId(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Generates a random 8-byte span ID as a hex string
 */
function generateSpanId(): string {
    return crypto.randomBytes(8).toString('hex');
}

/**
 * Converts hex string to bytes array
 */
function hexToBytes(hex: string): number[] {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return bytes;
}

/**
 * Generates sample OTLP trace data in JSON format
 */
export function generateSampleOtlpData(options?: {
    traceId?: string;
    spanCount?: number;
    resourceName?: string;
    scopeName?: string;
}): any {
    const traceId = options?.traceId || generateId();
    const spanCount = options?.spanCount || 3;
    const resourceName = options?.resourceName || 'test-service';
    const scopeName = options?.scopeName || 'test-instrumentation';
    
    const now = Date.now();
    const nanosPerMs = 1000000;
    const startTime = now * nanosPerMs;
    
    const spans = [];
    const rootSpanId = generateSpanId();
    
    // Generate root span
    spans.push({
        traceId: hexToBytes(traceId),
        spanId: hexToBytes(rootSpanId),
        parentSpanId: new Array(8).fill(0), // Root span has zero parent
        name: 'root-span',
        kind: 1, // SPAN_KIND_INTERNAL
        startTimeUnixNano: startTime.toString(),
        endTimeUnixNano: (startTime + 100000000).toString(), // 100ms duration
        attributes: [
            {
                key: 'span.type',
                value: {
                    stringValue: 'internal'
                }
            },
            {
                key: 'service.name',
                value: {
                    stringValue: resourceName
                }
            }
        ],
        status: {
            code: 1 // STATUS_CODE_OK
        },
        flags: 1
    });
    
    // Generate child spans
    for (let i = 1; i < spanCount; i++) {
        const childSpanId = generateSpanId();
        spans.push({
            traceId: hexToBytes(traceId),
            spanId: hexToBytes(childSpanId),
            parentSpanId: hexToBytes(rootSpanId),
            name: `child-span-${i}`,
            kind: 1, // SPAN_KIND_INTERNAL
            startTimeUnixNano: (startTime + (i * 10000000)).toString(), // Staggered start times
            endTimeUnixNano: (startTime + (i * 10000000) + 50000000).toString(), // 50ms duration
            attributes: [
                {
                    key: 'span.type',
                    value: {
                        stringValue: 'internal'
                    }
                },
                {
                    key: 'child.index',
                    value: {
                        intValue: i.toString()
                    }
                }
            ],
            status: {
                code: 1 // STATUS_CODE_OK
            },
            flags: 1
        });
    }
    
    return {
        resourceSpans: [
            {
                resource: {
                    attributes: [
                        {
                            key: 'service.name',
                            value: {
                                stringValue: resourceName
                            }
                        },
                        {
                            key: 'service.version',
                            value: {
                                stringValue: '1.0.0'
                            }
                        }
                    ],
                    droppedAttributesCount: 0
                },
                scopeSpans: [
                    {
                        scope: {
                            name: scopeName,
                            version: '1.0.0',
                            attributes: [],
                            droppedAttributesCount: 0
                        },
                        spans: spans,
                        schemaUrl: ''
                    }
                ],
                schemaUrl: ''
            }
        ]
    };
}

/**
 * Publishes sample OTLP data to the trace server
 * @param port - The port number where the trace server is running (default: 4318)
 * @param options - Optional parameters for generating the sample data
 * @returns Promise that resolves when the data is successfully published
 */
export async function publishSampleOtlpData(
    port: number = 4318,
    options?: {
        traceId?: string;
        spanCount?: number;
        resourceName?: string;
        scopeName?: string;
    }
): Promise<void> {
    const sampleData = generateSampleOtlpData(options);
    
    const response = await fetch(`http://localhost:${port}/v1/traces`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleData)
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to publish OTLP data: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return;
}

