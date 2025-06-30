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

import { ConfigurePanelData, LineRange, TypeField } from "@wso2/ballerina-core";
import { ExpressionFormField } from "@wso2/ballerina-side-panel";
import { useEffect, useState } from "react";
import { PanelBody } from ".";
import { MemoizedParameterBranch } from "./ConfigurePanel";
import { getDefaultParams } from "./ConfigurePanel/utils";
import styled from "@emotion/styled";

interface ConfigureViewProps {
  filePath: string;
  position: LineRange;
  updateFormField: (data: ExpressionFormField) => void;
  editorKey: string;
  configurePanelData: ConfigurePanelData;
}

export const LabelContainer = styled.div({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  paddingBottom: '10px'
});

export const Description = styled.div({
  color: 'var(--vscode-list-deemphasizedForeground)',
});

const Label = styled.div<{}>`
    font-size: 14px;
    font-family: GilmerBold;
    padding-top: 10px;
    padding-bottom: 10px;
    text-wrap: nowrap;
`;

export function ConfigureView(props: ConfigureViewProps) {
  const { filePath, position, updateFormField, editorKey, configurePanelData } = props;

  const [parameters, setParameters] = useState<TypeField[]>([]);


  useEffect(() => {
    // TODO: LS call to fetch the model based on the source
    console.log("====>>> configurePanelData in Configure view: ", configurePanelData);
    const testParameters: TypeField[] = [
      {
        "name": "httpVersion",
        "typeName": "enum",
        "optional": false,
        "defaultable": true,
        "hasRestType": false,
        "typeInfo": {
          "name": "HttpVersion",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        },
        "members": [
          {
            "typeName": "2.0",
            "optional": false,
            "defaultable": false
          },
          {
            "typeName": "1.1",
            "optional": false,
            "defaultable": false
          },
          {
            "typeName": "1.0",
            "optional": false,
            "defaultable": false
          }
        ]
      },
      {
        "name": "http1Settings",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "keepAlive",
            "typeName": "union",
            "optional": false,
            "defaultable": true,
            "hasRestType": false,
            "typeInfo": {
              "name": "KeepAlive",
              "orgName": "ballerina",
              "moduleName": "http",
              "version": "2.6.0"
            },
            "members": [
              {
                "typeName": "AUTO",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "ALWAYS",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "NEVER",
                "optional": false,
                "defaultable": false
              }
            ]
          },
          {
            "name": "chunking",
            "typeName": "union",
            "optional": false,
            "defaultable": true,
            "hasRestType": false,
            "typeInfo": {
              "name": "Chunking",
              "orgName": "ballerina",
              "moduleName": "http",
              "version": "2.6.0"
            },
            "members": [
              {
                "typeName": "AUTO",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "ALWAYS",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "NEVER",
                "optional": false,
                "defaultable": false
              }
            ]
          },
          {
            "name": "proxy",
            "typeName": "record",
            "optional": true,
            "defaultable": false,
            "fields": [
              {
                "name": "host",
                "typeName": "string",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              },
              {
                "name": "port",
                "typeName": "int",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              },
              {
                "name": "userName",
                "typeName": "string",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              },
              {
                "name": "password",
                "typeName": "string",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              }
            ],
            "hasRestType": false,
            "typeInfo": {
              "name": "ProxyConfig",
              "orgName": "ballerinax",
              "moduleName": "covid19",
              "version": "1.5.1"
            }
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "ClientHttp1Settings",
          "orgName": "ballerinax",
          "moduleName": "covid19",
          "version": "1.5.1"
        }
      },
      {
        "name": "http2Settings",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "http2PriorKnowledge",
            "typeName": "boolean",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "ClientHttp2Settings",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "timeout",
        "typeName": "decimal",
        "optional": false,
        "defaultable": true,
        "hasRestType": false
      },
      {
        "name": "forwarded",
        "typeName": "string",
        "optional": false,
        "defaultable": true,
        "hasRestType": false
      },
      {
        "name": "poolConfig",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "maxActiveConnections",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "maxIdleConnections",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "waitTime",
            "typeName": "decimal",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "maxActiveStreamsPerConnection",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "PoolConfiguration",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "cache",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "enabled",
            "typeName": "boolean",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "isShared",
            "typeName": "boolean",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "capacity",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "evictionFactor",
            "typeName": "float",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "policy",
            "typeName": "union",
            "optional": false,
            "defaultable": true,
            "hasRestType": false,
            "typeInfo": {
              "name": "CachingPolicy",
              "orgName": "ballerina",
              "moduleName": "http",
              "version": "2.6.0"
            },
            "members": [
              {
                "typeName": "CACHE_CONTROL_AND_VALIDATORS",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "RFC_7234",
                "optional": false,
                "defaultable": false
              }
            ]
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "CacheConfig",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "compression",
        "typeName": "union",
        "optional": false,
        "defaultable": true,
        "hasRestType": false,
        "typeInfo": {
          "name": "Compression",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        },
        "members": [
          {
            "typeName": "AUTO",
            "optional": false,
            "defaultable": false
          },
          {
            "typeName": "ALWAYS",
            "optional": false,
            "defaultable": false
          },
          {
            "typeName": "NEVER",
            "optional": false,
            "defaultable": false
          }
        ]
      },
      {
        "name": "circuitBreaker",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "rollingWindow",
            "typeName": "record",
            "optional": false,
            "defaultable": true,
            "fields": [
              {
                "name": "requestVolumeThreshold",
                "typeName": "int",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              },
              {
                "name": "timeWindow",
                "typeName": "decimal",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              },
              {
                "name": "bucketSize",
                "typeName": "decimal",
                "optional": false,
                "defaultable": true,
                "hasRestType": false
              }
            ],
            "hasRestType": false,
            "typeInfo": {
              "name": "RollingWindow",
              "orgName": "ballerina",
              "moduleName": "http",
              "version": "2.6.0"
            }
          },
          {
            "name": "failureThreshold",
            "typeName": "float",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "resetTime",
            "typeName": "decimal",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "statusCodes",
            "typeName": "array",
            "optional": false,
            "defaultable": true,
            "hasRestType": false,
            "memberType": {
              "typeName": "int",
              "optional": false,
              "defaultable": false
            }
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "CircuitBreakerConfig",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "retryConfig",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "count",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "interval",
            "typeName": "decimal",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "backOffFactor",
            "typeName": "float",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "maxWaitInterval",
            "typeName": "decimal",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "statusCodes",
            "typeName": "array",
            "optional": false,
            "defaultable": true,
            "hasRestType": false,
            "memberType": {
              "typeName": "int",
              "optional": false,
              "defaultable": false
            }
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "RetryConfig",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "responseLimits",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "maxStatusLineLength",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "maxHeaderSize",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "maxEntityBodySize",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "ResponseLimitConfigs",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "secureSocket",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "enable",
            "typeName": "boolean",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "cert",
            "typeName": "union",
            "optional": true,
            "defaultable": false,
            "hasRestType": false,
            "members": [
              {
                "typeName": "record",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "string",
                "optional": false,
                "defaultable": false
              }
            ]
          },
          {
            "name": "key",
            "typeName": "union",
            "optional": true,
            "defaultable": false,
            "hasRestType": false,
            "members": [
              {
                "typeName": "record",
                "optional": false,
                "defaultable": false
              },
              {
                "typeName": "record",
                "optional": false,
                "defaultable": false
              }
            ]
          },
          {
            "name": "protocol",
            "typeName": "record",
            "optional": true,
            "defaultable": false,
            "fields": [
              {
                "name": "name",
                "typeName": "enum",
                "optional": false,
                "defaultable": false,
                "hasRestType": false,
                "typeInfo": {
                  "name": "Protocol",
                  "orgName": "ballerina",
                  "moduleName": "http",
                  "version": "2.6.0"
                },
                "members": [
                  {
                    "typeName": "DTLS",
                    "optional": false,
                    "defaultable": false
                  },
                  {
                    "typeName": "TLS",
                    "optional": false,
                    "defaultable": false
                  },
                  {
                    "typeName": "SSL",
                    "optional": false,
                    "defaultable": false
                  }
                ]
              },
              {
                "name": "versions",
                "typeName": "array",
                "optional": false,
                "defaultable": true,
                "hasRestType": false,
                "memberType": {
                  "typeName": "string",
                  "optional": false,
                  "defaultable": false
                }
              }
            ],
            "hasRestType": false
          },
          {
            "name": "certValidation",
            "typeName": "record",
            "optional": true,
            "defaultable": false,
            "fields": [
              {
                "name": "type",
                "typeName": "enum",
                "optional": false,
                "defaultable": true,
                "hasRestType": false,
                "typeInfo": {
                  "name": "CertValidationType",
                  "orgName": "ballerina",
                  "moduleName": "http",
                  "version": "2.6.0"
                },
                "members": [
                  {
                    "typeName": "OCSP_STAPLING",
                    "optional": false,
                    "defaultable": false
                  },
                  {
                    "typeName": "OCSP_CRL",
                    "optional": false,
                    "defaultable": false
                  }
                ]
              },
              {
                "name": "cacheSize",
                "typeName": "int",
                "optional": false,
                "defaultable": false,
                "hasRestType": false
              },
              {
                "name": "cacheValidityPeriod",
                "typeName": "int",
                "optional": false,
                "defaultable": false,
                "hasRestType": false
              }
            ],
            "hasRestType": false
          },
          {
            "name": "ciphers",
            "typeName": "array",
            "optional": true,
            "defaultable": false,
            "hasRestType": false,
            "memberType": {
              "typeName": "string",
              "optional": false,
              "defaultable": false
            }
          },
          {
            "name": "verifyHostName",
            "typeName": "boolean",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "shareSession",
            "typeName": "boolean",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "handshakeTimeout",
            "typeName": "decimal",
            "optional": true,
            "defaultable": false,
            "hasRestType": false
          },
          {
            "name": "sessionTimeout",
            "typeName": "decimal",
            "optional": true,
            "defaultable": false,
            "hasRestType": false
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "ClientSecureSocket",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "proxy",
        "typeName": "record",
        "optional": true,
        "defaultable": false,
        "fields": [
          {
            "name": "host",
            "typeName": "string",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "port",
            "typeName": "int",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "userName",
            "typeName": "string",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          },
          {
            "name": "password",
            "typeName": "string",
            "optional": false,
            "defaultable": true,
            "hasRestType": false
          }
        ],
        "hasRestType": false,
        "typeInfo": {
          "name": "ProxyConfig",
          "orgName": "ballerina",
          "moduleName": "http",
          "version": "2.6.0"
        }
      },
      {
        "name": "validation",
        "typeName": "boolean",
        "optional": false,
        "defaultable": true,
        "hasRestType": false
      }
    ];
    setParameters(testParameters);
  }, [filePath, position, configurePanelData]);


  const handleOnChange = () => {
    // TODO: Call LS and get the source based on the updated model with selected state

    const modelParams = getDefaultParams(parameters);

    let content = "{" + modelParams.join(",") + "}";
    console.log("====>>> content: ", content);
    const updateData: ExpressionFormField = {
      value: content,
      key: editorKey,
      isConfigured: true,
      cursorPosition: { line: position.endLine.line, offset: position.endLine.offset }
    }
    updateFormField(updateData);
  }


  return (
    <PanelBody>
      <div style={{ height: "calc(100vh - 100px)", width: "380px", overflow: "scroll" }}>
        {parameters?.length > 0 ? (
          <>
            <LabelContainer>
              <Description >{`Select from the list given below to construct the expression`}</Description>
            </LabelContainer>

            <LabelContainer>
              <Label>{`${configurePanelData.name}`}</Label>
              <Description>{configurePanelData.documentation}</Description>
            </LabelContainer>
            
            <MemoizedParameterBranch parameters={parameters} depth={1} onChange={handleOnChange} />
          </>
        ) :
          <LabelContainer>
            <Label>{`No supported configure fields available for ${configurePanelData.name}`}</Label>
          </LabelContainer>
        }
      </div>
    </PanelBody>
  );
}
