export interface SystemMessage {
    cache_control?: {
        type: "ephemeral";
    };
    type: "text";
    text: string;
}

export interface TextBlock {
    cache_control?: {
        type: "ephemeral";
    };
    text: string;
    type: "text";
}

export interface ImageBlockSource {
    data: string;
    media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    type: "base64";
}

export interface ImageBlock {
    source: ImageBlockSource;
    type: "image";
}

export interface DocumentBlock {
    source: DocumentBlockSource;
    type: "document";
}

export interface DocumentBlockSource {
    data: string;
    media_type: "application/pdf";
    type: "base64";
}

export interface ToolUseBlock {
    id: string;
    name: string;
    input: Record<string, any>;
    type: "tool_use";
}

export interface ToolResultBlock {
    tool_use_id: string;
    content: string | Block[];
    is_error?: boolean;
    type: "tool_result";
}

export type Block = TextBlock | ImageBlock | ToolUseBlock | ToolResultBlock | DocumentBlock;

export type MessageRole = "user" | "assistant";

export interface Usage {
    input_tokens: number;
    output_tokens: number;
}

export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | null;

export interface Message {
    id?: string;
    content: string | Block[];
    role: MessageRole;
    model?: string;
    stop_reason?: StopReason;
    stop_sequence?: any;
    type?: string;
    usage?: Usage;
}

export interface CreateMessageRequestMetadata {
    user_id?: string;
}

export type ToolChoiceType = "auto" | "any" | "tool";

export interface ToolChoice {
    type: ToolChoiceType;
    name?: string;
}

export interface Tool {
    name: string;
    description?: string;
    input_schema: Record<string, any>;
}

export interface CreateMessageRequest {
    model: string | "claude-3-5-sonnet-20240620" | "claude-3-haiku-20240307" | "claude-3-opus-20240229" | "claude-3-sonnet-20240229" | "claude-2.0" | "claude-2.1" | "claude-instant-1.2";
    messages: Message[];
    max_tokens: number;
    metadata?: CreateMessageRequestMetadata;
    stop_sequences?: string[];
    system?: string | SystemMessage[];
    temperature?: number;
    tool_choice?: ToolChoice;
    tools?: Tool[];
    top_k?: number;
    top_p?: number;
    stream?: boolean;
}
