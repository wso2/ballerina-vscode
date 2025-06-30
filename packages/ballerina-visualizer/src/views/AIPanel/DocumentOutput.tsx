
import React from 'react';
import styled from '@emotion/styled';

const DocumentContainer = styled.div({
    padding: '20px',
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground)',
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: 'var(--vscode-editor-font-size)',
    lineHeight: 'var(--vscode-editor-line-height)',
});

const DocumentTitle = styled.h2({
    marginBottom: '15px',
    color: 'var(--vscode-editor-foreground)',
});

const DocumentContent = styled.div({
    whiteSpace: 'pre-wrap',
});

interface DocumentOutputProps {
    title?: string;
    content?: string;
}

const DocumentOutput: React.FC<DocumentOutputProps> = ({
    title = 'Default Title',
    content = 'No content available.'
}) => {
    return (
        <DocumentContainer>
            <DocumentTitle>{title}</DocumentTitle>
            <DocumentContent>{content}</DocumentContent>
        </DocumentContainer>
    );
};

export default DocumentOutput;
