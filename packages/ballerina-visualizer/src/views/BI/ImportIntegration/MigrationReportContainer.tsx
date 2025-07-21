import React, { useEffect, useRef } from "react";

interface MigrationReportContainerProps {
    htmlContent: string;
}

const MigrationReportContainer: React.FC<MigrationReportContainerProps> = ({ htmlContent }) => {
    const hostRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;

        // Create a Shadow Root if one doesn't already exist.
        if (!host.shadowRoot) {
            host.attachShadow({ mode: "open" });
        }

        // Set the HTML content of the Shadow Root.
        // The styles inside will be scoped to this component.
        host.shadowRoot!.innerHTML = htmlContent;
    }, [htmlContent]);

    return <div ref={hostRef} />;
};

export default MigrationReportContainer;
