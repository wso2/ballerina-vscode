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
// tslint:disable: jsx-no-multiline-js

import React from 'react';


import { AutoMapError } from './AutoMapError';
import { ErrorNodeKind, RenderingError } from './RenderingError';
import { WarningBanner } from '../Warning/DataMapperWarning';
import { DataMapperInputParam, DataMapperOutputParam } from '../ConfigPanel/InputParamsPanel/types';

// Function to render WarningBanner with error message
const renderWarningBanner = (classes: any, message: React.ReactNode) => (
    <WarningBanner
        message={message}
        className={classes.errorBanner}
    />
);

// Function to render error message with overlay
const renderErrorMessage = (classes: any, errorMessage: React.ReactNode) => (
    <>
        <div className={classes.overlay} />
        <div className={classes.errorMessage}>
            {errorMessage}
        </div>
    </>
);

// Component to render error based on error kind
export const IOErrorComponent: React.FC<{
    errorKind: ErrorNodeKind;
    classes: any
}> = ({ errorKind, classes }) => {
    if (errorKind) {
        const errorMessage = <RenderingError errorNodeKind={errorKind} />;
        return renderErrorMessage(classes, renderWarningBanner(classes, errorMessage));
    }
    return null;
};

// Component to render auto map error
export const AutoMapErrorComponent: React.FC<{
    autoMapError: AutoMapError;
    classes: any
}> = ({ autoMapError, classes }) => {
    if (autoMapError) {
        const errorMessage = <AutoMapError {...autoMapError} />;
        return renderErrorMessage(classes, renderWarningBanner(classes, errorMessage));
    }
    return null;
};

// Component to render error for unsupported IO
export const UnsupportedIOErrorComponent: React.FC<{
    inputs: DataMapperInputParam[];
    output: DataMapperOutputParam;
    classes: any;
}> = ({ inputs, output, classes }) => {
    const hasInvalidInputs = inputs.some(input => input.isUnsupported);
    const hasInvalidOutput = output.isUnsupported;

    let errorMsg = `The Data Mapper does not support the selected `;
    if (hasInvalidInputs) {
        errorMsg += 'input type(s)';
    }
    if (hasInvalidOutput) {
        errorMsg += `${hasInvalidInputs ? ' and output type.' : 'output type.'}`;
    } else {
        errorMsg += '.';
    }
    errorMsg += ' Please ensure you are using compatible Record Types or Primitive Types.';

    const errorMessage = <p>{errorMsg}</p>;
    return renderErrorMessage( classes, renderWarningBanner(classes, errorMessage));
};
