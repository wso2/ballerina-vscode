export enum ANALYZE_TYPE {
    ADVANCED = "advanced",
    REALTIME = "realtime",
}

export interface TopBarData {
    latency: string;
    concurrency: string;
    tps: string;
    analyzeType: ANALYZE_TYPE;
}
