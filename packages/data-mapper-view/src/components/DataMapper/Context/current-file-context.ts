import React from "react";

export interface CurrentFile {
    content: string;
    path: string;
    size: number;
}

export const CurrentFileContext = React.createContext<CurrentFile>(undefined);
