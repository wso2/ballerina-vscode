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

import { ProjectStructureArtifactResponse } from "../..";

export interface ExportOASRequest {
    documentFilePath?: string;
}
export interface ExportOASResponse {
    openSpecFile: string;
}
export interface ResponseCode {
    code: number;
    title: string;
    source: string;
}

export const responseCodes: ResponseCode[] = [
    { code: 200, title: "200 - OK", source: "http:Ok" },
    { code: 100, title: "100 - Continue", source: "http:Continue" },
    { code: 101, title: "101 - Switching Protocols", source: "http:SwitchingProtocols" },
    { code: 201, title: "201 - Created", source: "http:Created" },
    { code: 202, title: "202 - Accepted", source: "http:Accepted" },
    { code: 203, title: "203 - Non-Authoritative Information", source: "http:NonAuthoritativeInformation" },
    { code: 204, title: "204 - No Content", source: "http:NoContent" },
    { code: 205, title: "205 - Reset Content", source: "http:ResetContent" },
    { code: 206, title: "206 - Partial Content", source: "http:PartialContent" },
    { code: 207, title: "207 - Multi-Status", source: "http:MultiStatus" },
    { code: 208, title: "208 - Already Reported", source: "http:AlreadyReported" },
    { code: 226, title: "226 - IM Used", source: "http:IMUsed" },
    { code: 300, title: "300 - Multiple Choices", source: "http:MultipleChoices" },
    { code: 301, title: "301 - Moved Permanently", source: "http:MovedPermanently" },
    { code: 302, title: "302 - Found", source: "http:Found" },
    { code: 303, title: "303 - See Other", source: "http:SeeOther" },
    { code: 304, title: "304 - Not Modified", source: "http:NotModified" },
    { code: 305, title: "305 - Use Proxy", source: "http:UseProxy" },
    { code: 307, title: "307 - Temporary Redirect", source: "http:TemporaryRedirect" },
    { code: 308, title: "308 - Permanent Redirect", source: "http:PermanentRedirect" },
    { code: 400, title: "400 - Bad Request", source: "http:BadRequest" },
    { code: 401, title: "401 - Unauthorized", source: "http:Unauthorized" },
    { code: 402, title: "402 - Payment Required", source: "http:PaymentRequired" },
    { code: 403, title: "403 - Forbidden", source: "http:Forbidden" },
    { code: 404, title: "404 - Not Found", source: "http:NotFound" },
    { code: 405, title: "405 - Method Not Allowed", source: "http:MethodNotAllowed" },
    { code: 406, title: "406 - Not Acceptable", source: "http:NotAcceptable" },
    { code: 407, title: "407 - Proxy Authentication Required", source: "http:ProxyAuthenticationRequired" },
    { code: 408, title: "408 - Request Timeout", source: "http:RequestTimeout" },
    { code: 409, title: "409 - Conflict", source: "http:Conflict" },
    { code: 410, title: "410 - Gone", source: "http:Gone" },
    { code: 411, title: "411 - Length Required", source: "http:LengthRequired" },
    { code: 412, title: "412 - Precondition Failed", source: "http:PreconditionFailed" },
    { code: 413, title: "413 - Payload Too Large", source: "http:PayloadTooLarge" },
    { code: 414, title: "414 - URI Too Long", source: "http:UriTooLong" },
    { code: 415, title: "415 - Unsupported Media Type", source: "http:UnsupportedMediaType" },
    { code: 416, title: "416 - Range Not Satisfiable", source: "http:RangeNotSatisfiable" },
    { code: 417, title: "417 - Expectation Failed", source: "http:ExpectationFailed" },
    { code: 422, title: "422 - Unprocessable Entity", source: "http:UnprocessableEntity" },
    { code: 423, title: "423 - Locked", source: "http:Locked" },
    { code: 424, title: "424 - Failed Dependency", source: "http:FailedDependency" },
    { code: 425, title: "425 - Too Early", source: "http:TooEarly" },
    { code: 426, title: "426 - Upgrade Required", source: "http:UpgradeRequired" },
    { code: 428, title: "428 - Precondition Required", source: "http:PreconditionRequired" },
    { code: 429, title: "429 - Too Many Requests", source: "http:TooManyRequests" },
    { code: 431, title: "431 - Request Header Fields Too Large", source: "http:RequestHeaderFieldsTooLarge" },
    { code: 451, title: "451 - Unavailable Due To Legal Reasons", source: "http:UnavailableDueToLegalReasons" },
    { code: 500, title: "500 - Internal Server Error", source: "http:InternalServerError" },
    { code: 501, title: "501 - Not Implemented", source: "http:NotImplemented" },
    { code: 502, title: "502 - Bad Gateway", source: "http:BadGateway" },
    { code: 503, title: "503 - Service Unavailable", source: "http:ServiceUnavailable" },
    { code: 504, title: "504 - Gateway Timeout", source: "http:GatewayTimeout" },
    { code: 505, title: "505 - HTTP Version Not Supported", source: "http:HttpVersionNotSupported" },
    { code: 506, title: "506 - Variant Also Negotiates", source: "http:VariantAlsoNegotiates" },
    { code: 507, title: "507 - Insufficient Storage", source: "http:InsufficientStorage" },
    { code: 508, title: "508 - Loop Detected", source: "http:LoopDetected" },
    { code: 510, title: "510 - Not Extended", source: "http:NotExtended" },
    { code: 511, title: "511 - Network Authentication Required", source: "http:NetworkAuthorizationRequired" }
]

export interface SourceUpdateResponse {
    artifacts: ProjectStructureArtifactResponse[]
}
