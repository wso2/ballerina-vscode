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
 * software distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as vscode from 'vscode';
import { Trace, Span } from './trace-server';
import { TraceServer } from './trace-server';
import { TracerMachine } from './tracer-machine';

/**
 * Represents a trace node in the tree view
 */
class TraceNode {
    constructor(
        public readonly trace: Trace,
        public readonly label: string
    ) {}
}

/**
 * Represents a span node in the tree view
 */
class SpanNode {
    constructor(
        public readonly span: Span,
        public readonly traceId: string,
        public readonly label: string,
        public readonly children: SpanNode[]
    ) {}
}

/**
 * TreeDataProvider for displaying traces and spans
 */
export class TraceTreeDataProvider implements vscode.TreeDataProvider<TraceNode | SpanNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<TraceNode | SpanNode | undefined | null | void> = 
        new vscode.EventEmitter<TraceNode | SpanNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TraceNode | SpanNode | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    private traceServerUnsubscribeUpdated?: () => void;
    private traceServerUnsubscribeCleared?: () => void;

    constructor() {
        // Subscribe to TracerMachine state changes
        // Note: TracerMachine.onUpdate doesn't return unsubscribe function
        TracerMachine.onUpdate((state: any) => {
            this.refresh();
        });

        // Subscribe to TraceServer updates
        this.traceServerUnsubscribeUpdated = TraceServer.onTracesUpdated(async () => {
            const traces = TraceServer.getTraces();
            if (traces.length > 0) {
                // Update context when first trace arrives
                await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', false);
            }
            this.refresh();
        });

        this.traceServerUnsubscribeCleared = TraceServer.onTracesCleared(async () => {
            await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', true);
            this.refresh();
        });
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TraceNode | SpanNode): vscode.TreeItem {
        if (element instanceof TraceNode) {
            const item = new vscode.TreeItem(
                element.label,
                vscode.TreeItemCollapsibleState.Collapsed
            );
            item.tooltip = `Trace ID: ${element.trace.traceId}\n` +
                `Resource: ${element.trace.resource.name}\n` +
                `Scope: ${element.trace.scope.name}\n` +
                `First Seen: ${element.trace.firstSeen.toLocaleString()}\n` +
                `Last Seen: ${element.trace.lastSeen.toLocaleString()}\n` +
                `Spans: ${element.trace.spans.length}`;
            item.iconPath = new vscode.ThemeIcon('search');
            item.contextValue = 'trace';
            // Add command to open trace details when clicked
            item.command = {
                command: 'ballerina.showTraceDetails',
                title: 'Show Trace Details',
                arguments: [element.trace]
            };
            return item;
        } else {
            // SpanNode
            const hasChildren = element.children.length > 0;
            const item = new vscode.TreeItem(
                element.label,
                hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
            );
            
            // Build tooltip with span details
            const spanKind = this.getSpanKindLabel(element.span.kind);
            item.tooltip = `Span: ${element.span.name}\n` +
                `Kind: ${spanKind}\n` +
                `Trace ID: ${element.traceId}\n` +
                `Span ID: ${element.span.spanId}\n` +
                (element.span.parentSpanId && element.span.parentSpanId !== '0000000000000000' ? `Parent Span ID: ${element.span.parentSpanId}` : 'Root Span');
            
            item.iconPath = new vscode.ThemeIcon('package');
            item.contextValue = 'span';

            // Add command to open trace details with this span focused when clicked
            const traces = TraceServer.getTraces();
            const trace = traces.find(t => t.traceId === element.traceId);
            if (trace) {
                item.command = {
                    command: 'ballerina.showTraceDetails',
                    title: 'Show Trace Details',
                    arguments: [trace, element.span.spanId]
                };
            }

            return item;
        }
    }

    async getChildren(element?: TraceNode | SpanNode): Promise<(TraceNode | SpanNode)[]> {
        // Check if tracing is enabled
        const isEnabled = TracerMachine.isEnabled();
        
        if (!isEnabled) {
            // Return empty array - VS Code will show placeholder from viewsWelcome
            return [];
        }
        
        // Get traces from TraceServer
        const traces = TraceServer.getTraces();
        
        if (traces.length === 0) {
            // Return empty array - VS Code will show empty state placeholder
            // Make sure ballerina.tracesEmpty context is set to true
            await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', true);
            return [];
        }
        
        // Update context - traces exist now
        await vscode.commands.executeCommand('setContext', 'ballerina.tracesEmpty', false);
        
        // Return trace nodes or span nodes based on element
        if (!element) {
            // Root level - return all traces
            return traces.map(trace => new TraceNode(
                trace,
                `Trace: ${this.truncateId(trace.traceId)}`
            ));
        } else if (element instanceof TraceNode) {
            // Trace node - return child spans (organized hierarchically)
            return this.getSpansForTrace(element.trace);
        } else if (element instanceof SpanNode) {
            // Span node - return child spans if any
            return element.children;
        }
        
        return [];
    }

    getParent(element: TraceNode | SpanNode): vscode.ProviderResult<TraceNode | SpanNode> {
        // Root elements (TraceNodes) have no parent
        if (element instanceof TraceNode) {
            return undefined;
        }
        
        // For SpanNodes, find the parent based on parentSpanId
        if (element instanceof SpanNode) {
            const parentSpanId = element.span.parentSpanId;
            
            // If no parent span ID or it's the root span marker, parent is the TraceNode
            if (!parentSpanId || 
                parentSpanId === '0000000000000000' || 
                parentSpanId === '') {
                // Return the parent TraceNode
                const traces = TraceServer.getTraces();
                const trace = traces.find(t => t.traceId === element.traceId);
                if (trace) {
                    return new TraceNode(trace, `Trace: ${this.truncateId(trace.traceId)}`);
                }
                return undefined;
            }
            
            // Find the parent span in the same trace
            const traces = TraceServer.getTraces();
            const trace = traces.find(t => t.traceId === element.traceId);
            if (trace) {
                // Find the parent span by parentSpanId
                const parentSpan = trace.spans.find(s => s.spanId === parentSpanId);
                if (parentSpan) {
                    // Build the hierarchy and find the parent SpanNode
                    const spanNodes = this.getSpansForTrace(trace);
                    const parentNode = this.findSpanNodeById(parentSpanId, spanNodes);
                    if (parentNode) {
                        return parentNode;
                    }
                    
                    // If not found in hierarchy (shouldn't happen), create one
                    // This is a fallback for edge cases
                    const label = this.formatSpanLabel(parentSpan);
                    return new SpanNode(parentSpan, element.traceId, label, []);
                }
            }
        }
        
        return undefined;
    }

    /**
     * Recursively find a span node by span ID
     */
    private findSpanNodeById(spanId: string, spanNodes: SpanNode[]): SpanNode | null {
        for (const spanNode of spanNodes) {
            if (spanNode.span.spanId === spanId) {
                return spanNode;
            }
            
            // Recursively search in children
            const found = this.findSpanNodeById(spanId, spanNode.children);
            if (found) {
                return found;
            }
        }
        
        return null;
    }

    /**
     * Get spans for a trace, organized in a hierarchical structure
     */
    private getSpansForTrace(trace: Trace): SpanNode[] {
        const spanMap = new Map<string, SpanNode>();
        const rootSpans: SpanNode[] = [];

        // First pass: create all span nodes
        trace.spans.forEach(span => {
            // spanId is already a hex string from trace-server
            const spanIdHex = span.spanId || '';
            const label = this.formatSpanLabel(span);
            
            spanMap.set(spanIdHex, new SpanNode(
                span,
                trace.traceId,
                label,
                [] // Children will be set in second pass
            ));
        });

        // Second pass: build parent-child relationships
        trace.spans.forEach(span => {
            const spanIdHex = span.spanId || '';
            const parentSpanIdHex = span.parentSpanId || '';
            const spanNode = spanMap.get(spanIdHex);
            
            if (!spanNode) {
                return;
            }

            // Root span: empty or all zeros parentSpanId, or parent not found
            if (!parentSpanIdHex || 
                parentSpanIdHex === '0000000000000000' || 
                parentSpanIdHex === '' ||
                !spanMap.has(parentSpanIdHex)) {
                rootSpans.push(spanNode);
            } else {
                // Child span - add to parent's children
                const parentNode = spanMap.get(parentSpanIdHex);
                if (parentNode) {
                    parentNode.children.push(spanNode);
                }
            }
        });

        // Sort root spans by span name for consistency
        rootSpans.sort((a, b) => a.span.name.localeCompare(b.span.name));

        return rootSpans;
    }

    /**
     * Format span label with name and kind
     */
    private formatSpanLabel(span: Span): string {
        const spanKind = this.getSpanKindLabel(span.kind);
        return `${span.name} (${spanKind})`;
    }

    /**
     * Get human-readable span kind label
     */
    private getSpanKindLabel(kind: string | number): string {
        if (typeof kind === 'string') {
            return kind;
        }
        const kindMap: { [key: number]: string } = {
            0: 'UNSPECIFIED',
            1: 'INTERNAL',
            2: 'SERVER',
            3: 'CLIENT',
            4: 'PRODUCER',
            5: 'CONSUMER'
        };
        return kindMap[kind] || `UNKNOWN(${kind})`;
    }

    /**
     * Truncate trace ID for display
     */
    private truncateId(id: string, length: number = 8): string {
        if (id.length <= length) {
            return id;
        }
        return `${id.substring(0, length)}...`;
    }

    /**
     * Format trace details as text for display in editor
     */
    static formatTraceDetails(trace: Trace): string {
        const lines: string[] = [];
        
        // Header
        lines.push('='.repeat(80));
        lines.push('TRACE DETAILS');
        lines.push('='.repeat(80));
        lines.push('');
        
        // Trace Information
        lines.push('Trace ID:');
        lines.push(`  ${trace.traceId}`);
        lines.push('');
        
        lines.push('Resource:');
        lines.push(`  Name: ${trace.resource.name}`);
        if (trace.resource.attributes && trace.resource.attributes.length > 0) {
            lines.push('  Attributes:');
            trace.resource.attributes.forEach(attr => {
                lines.push(`    ${attr.key}: ${attr.value}`);
            });
        }
        lines.push('');
        
        lines.push('Instrumentation Scope:');
        lines.push(`  Name: ${trace.scope.name}`);
        if (trace.scope.version) {
            lines.push(`  Version: ${trace.scope.version}`);
        }
        if (trace.scope.attributes && trace.scope.attributes.length > 0) {
            lines.push('  Attributes:');
            trace.scope.attributes.forEach(attr => {
                lines.push(`    ${attr.key}: ${attr.value}`);
            });
        }
        lines.push('');
        
        lines.push('Timestamps:');
        lines.push(`  First Seen: ${trace.firstSeen.toLocaleString()}`);
        lines.push(`  Last Seen: ${trace.lastSeen.toLocaleString()}`);
        const duration = trace.lastSeen.getTime() - trace.firstSeen.getTime();
        lines.push(`  Duration: ${duration}ms`);
        lines.push('');
        
        // Spans
        lines.push('='.repeat(80));
        lines.push(`SPANS (${trace.spans.length} total)`);
        lines.push('='.repeat(80));
        lines.push('');
        
        // Build span hierarchy
        const spanMap = new Map<string, Span>();
        const rootSpans: Span[] = [];
        
        trace.spans.forEach(span => {
            spanMap.set(span.spanId, span);
        });
        
        trace.spans.forEach(span => {
            const parentSpanId = span.parentSpanId || '';
            if (!parentSpanId || 
                parentSpanId === '0000000000000000' || 
                parentSpanId === '' ||
                !spanMap.has(parentSpanId)) {
                rootSpans.push(span);
            }
        });
        
        // Format spans recursively
        const formatSpan = (span: Span, indent: number = 0): void => {
            const indentStr = '  '.repeat(indent);
            const spanKind = this.getSpanKindLabelStatic(span.kind);
            
            lines.push(`${indentStr}${'─'.repeat(60 - indent * 2)}`);
            lines.push(`${indentStr}Span: ${span.name}`);
            lines.push(`${indentStr}  ID: ${span.spanId}`);
            lines.push(`${indentStr}  Kind: ${spanKind}`);
            if (span.parentSpanId && span.parentSpanId !== '0000000000000000') {
                lines.push(`${indentStr}  Parent Span ID: ${span.parentSpanId}`);
            } else {
                lines.push(`${indentStr}  Parent: Root Span`);
            }
            lines.push(`${indentStr}  Trace ID: ${span.traceId}`);
            
            // Find child spans
            const childSpans = trace.spans.filter(s => s.parentSpanId === span.spanId);
            if (childSpans.length > 0) {
                lines.push(`${indentStr}  Child Spans: ${childSpans.length}`);
                childSpans.forEach(childSpan => {
                    formatSpan(childSpan, indent + 1);
                });
            }
            lines.push('');
        };
        
        // Format all root spans
        rootSpans.forEach(span => {
            formatSpan(span, 0);
        });
        
        return lines.join('\n');
    }
    
    /**
     * Get human-readable span kind label (static version)
     */
    private static getSpanKindLabelStatic(kind: string | number): string {
        if (typeof kind === 'string') {
            return kind;
        }
        const kindMap: { [key: number]: string } = {
            0: 'UNSPECIFIED',
            1: 'INTERNAL',
            2: 'SERVER',
            3: 'CLIENT',
            4: 'PRODUCER',
            5: 'CONSUMER'
        };
        return kindMap[kind] || `UNKNOWN(${kind})`;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.traceServerUnsubscribeUpdated?.();
        this.traceServerUnsubscribeCleared?.();
        this._onDidChangeTreeData.dispose();
    }
}

