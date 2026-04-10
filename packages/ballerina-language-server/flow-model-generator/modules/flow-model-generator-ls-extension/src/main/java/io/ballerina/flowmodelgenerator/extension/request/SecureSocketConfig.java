/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package io.ballerina.flowmodelgenerator.extension.request;

/**
 * Configuration for secure socket (SSL/TLS) connections.
 *
 * @param cert     Truststore/CA certificate configuration for verifying the server.
 *                 Supports .pem, .crt, .p12, .pfx, and .jks formats.
 * @param key      Client keystore configuration for mutual TLS (mTLS).
 *                 Supports .p12, .pfx, and .jks formats only.
 * @param insecure If true, skip all certificate verification (development/testing only)
 *
 * @since 1.7.0
 */
public record SecureSocketConfig(CertConfig cert, CertConfig key, boolean insecure) {

    /**
     * Certificate or keystore file configuration.
     *
     * @param path     Path to the file. For cert: .pem, .crt, .p12, .pfx, .jks.
     *                 For key (mTLS): .p12, .pfx, .jks only.
     * @param password Password for the keystore (required for .p12/.pfx/.jks, not needed for .pem/.crt)
     */
    public record CertConfig(String path, String password) {
    }
}
