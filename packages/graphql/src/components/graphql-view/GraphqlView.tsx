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

import React, { useEffect, useState } from 'react';
import { GraphiQL } from "graphiql";
import GraphiQLExplorer from "graphiql-explorer";
import { buildClientSchema, getIntrospectionQuery, GraphQLSchema } from "graphql";
import "graphiql/graphiql.css";
import "./style.css";


declare const acquireVsCodeApi: () => {
    postMessage(message: any): void;
    getConfiguration(): {
        get(key: string): string | undefined;
    };
};

// Initialize vscode API safely
const vscode = typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : undefined;

interface Request {
    url: string,
    headers: any,
    method: string,
    body?: string,
}

function fetcher(api: string, body: Object, headers: string | undefined): Promise<any> {
    const request: Request = {
        url: api,
        method: "POST",
        headers: JSON.parse(headers ?? ''),
        body: JSON.stringify(body),
    }

    vscode?.postMessage({
        command: 'graphqlRequest',
        req: request
    });

    return new Promise(resolve => {
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'graphqlResponse':
                    if (!message.res) {
                        resolve(false);
                    }
                    resolve(message.res);
            }
        })
    });
}

export const GraphqlView = (props: any) => {
    const serviceAPI: string = props.data.serviceAPI;
    const icons: { dark: string, light: string } = props.data.icons;

    const [query, setQuery] = useState<string | undefined>('');
    const [schema, setSchema] = useState<GraphQLSchema | null>();
    const [headers, setHeaders] = useState<string | undefined>(JSON.stringify({
        "Content-Type": "application/json",
    }));

    // Get VSCode theme
    const [theme, setTheme] = useState<'light' | 'dark'>('light');

    useEffect(() => {
        // Set the theme from the vscode theme
        setTheme(document.body.classList.contains('vscode-dark') ? 'dark' : 'light');
    }, []);

    useEffect(() => {
        fetcher(serviceAPI, { query: getIntrospectionQuery() }, headers)
            .then(result => {
                setSchema(buildClientSchema(result.data));
            });
    }, []);

    const _handleEditQuery = (query?: string): void => setQuery(query);
    const _handleEditHeaders = (headers?: string): void => setHeaders(headers);
    const _fetcher = (params: Object) => {
        return fetcher(serviceAPI, params, headers);
    };

    const BallerinaIcon = () => {
        return <img src={icons[theme]} />;
    }

    const Explorer = () => {
        const [explorerQuery, setExplorerQuery] = useState<string | undefined>('');
        const [explorerSchema, setExplorerSchema] = useState<GraphQLSchema | null>();
        const [explorerTheme, setExplorerTheme] = useState<'light' | 'dark'>('light');

        useEffect(() => {

            setExplorerQuery(query);
            setExplorerSchema(schema);
            setExplorerTheme(theme);
        }, [query, schema, theme]);

        const handleExplorerEdit = (newQuery?: string) => {
            setExplorerQuery(newQuery);
            _handleEditQuery(newQuery);
        };

        return (
            <GraphiQLExplorer
                schema={explorerSchema}
                query={explorerQuery}
                onEdit={handleExplorerEdit}
                explorerIsOpen={true}
                defaultTheme={explorerTheme}
            />
        );
    };

    return (
        <div className="graphiql-container">
            <GraphiQL
                fetcher={_fetcher}
                schema={schema}
                headers={headers}
                query={query}
                onEditQuery={_handleEditQuery}
                onEditHeaders={_handleEditHeaders}
                defaultEditorToolsVisibility={true}
                forcedTheme={theme}
                visiblePlugin={"Ballerina Explorer"}
                plugins={[
                    {
                        title: 'Ballerina Explorer',
                        content: Explorer,
                        icon: BallerinaIcon
                    }
                ]}
            >
            </GraphiQL>
        </div >
    );
};
