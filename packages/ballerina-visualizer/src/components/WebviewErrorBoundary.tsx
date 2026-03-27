import React from "react";
import { WebviewErrorState } from "./WebviewErrorState";

interface WebviewErrorBoundaryProps {
    children: React.ReactNode;
    message: string;
    title?: string;
    onRetry?: () => void;
}

interface WebviewErrorBoundaryState {
    hasError: boolean;
}

export class WebviewErrorBoundary extends React.Component<WebviewErrorBoundaryProps, WebviewErrorBoundaryState> {
    public state: WebviewErrorBoundaryState = { hasError: false };

    public static getDerivedStateFromError(): WebviewErrorBoundaryState {
        return { hasError: true };
    }

    public componentDidCatch(error: Error) {
        console.error("Webview lazy load error:", error);
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
        this.props.onRetry?.();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <WebviewErrorState
                    title={this.props.title}
                    message={this.props.message}
                    onRetry={this.props.onRetry ? this.handleRetry : undefined}
                />
            );
        }

        return this.props.children;
    }
}
