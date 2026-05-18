# Connection - Test Specification

## Application Overview

The Connection feature in WSO2 Integrator: BI allows users to create client connections to external services. Connections can be configured with connection details, authentication settings, and advanced configurations specific to each connector type (e.g., HTTP, GraphQL, MySQL, etc.).

## UI Elements Identified

### Buttons and Actions
- **Add Artifact** button (text: "Add Artifact", icon: ➕)
- **Connection** option in Artifacts menu (under "Other Artifacts" section)
- **Connectors** section showing available connectors (HTTP, GraphQL, MySQL, MongoDB, etc.)
- **Create** button (in connection creation form)
- **Cancel** button (in connection creation form)
- **Save** button (in connection configuration view)
- **Configure** button (text: "Configure", icon: ⚙️) - for editing connection
- **Delete** button (icon: 🗑️) - for deleting connection

### Form Fields (HTTP Connection Example)
- **Url** textbox (required, type: string)
  - Description: "URL of the target service."
  - Has Text/Expression toggle
- **Advanced Configurations** expandable section (collapsed by default):
  - **HTTP Version** (type: http:HttpVersion, default: "2.0")
  - **HTTP1 Settings** (type: http:ClientHttp1Settings)
  - **HTTP2 Settings** (type: http:ClientHttp2Settings)
  - **Timeout** (type: decimal, default: 0.0d)
  - **Forwarded** (type: string, default: "")
  - **Follow Redirects** (type: http:FollowRedirects|())
  - **Pool Config** (type: http:PoolConfiguration|())
  - **Cache** (type: http:CacheConfig)
  - **Compression** (type: http:Compression, default: "AUTO")
  - **Auth** (type: http:CredentialsConfig|http:BearerTokenConfig|http:JwtIssuerConfig|http:OAuth2ClientCredentialsGrantConfig|http:OAuth2PasswordGrantConfig|http:OAuth2RefreshTokenGrantConfig|http:OAuth2JwtBearerGrantConfig|())
    - Description: "Client authentication options (Basic, Bearer token, OAuth, etc.)."
    - Has Record/Expression toggle
  - **Circuit Breaker** (type: http:CircuitBreakerConfig|())
  - **Retry Config** (type: http:RetryConfig|())
  - **Cookie Config** (type: http:CookieConfig|())
  - **Response Limits** (type: http:ResponseLimitConfigs)
  - **Proxy** (type: http:ProxyConfig|())
  - **Validation** (type: boolean, default: false)
  - **Socket Config** (type: http:ClientSocketConfig)
  - **Lax Data Binding** (type: boolean, default: false)
  - **Secure Socket** (type: http:ClientSecureSocket|())
- **Connection Name** textbox (required, default: "httpClient")
  - Description: "Name of the connection"

### Navigation Elements
- **Overview** breadcrumb
- **Artifacts** breadcrumb
- **Connection** breadcrumb
- **Connector** breadcrumb

### Tree View Elements
- **Connections** section
- **Connection** tree item (connection name, e.g., "httpClient")
- Connection type indicator (e.g., "Connection")

## Missing Test IDs Recommendations

The following test IDs should be added for better testability:

1. `data-testid="connection-option"`
2. `data-testid="http-connector-option"`
3. `data-testid="connection-url-input"`
4. `data-testid="connection-url-text-toggle"`
5. `data-testid="connection-url-expression-toggle"`
6. `data-testid="connection-name-input"`
7. `data-testid="advanced-configurations-expand"`
8. `data-testid="connection-auth-input"`
9. `data-testid="connection-auth-record-toggle"`
10. `data-testid="connection-auth-expression-toggle"`
11. `data-testid="create-connection-button"`
12. `data-testid="save-connection-button"`
13. `data-testid="configure-connection-button"`
14. `data-testid="delete-connection-button"`

## Test Scenarios

### 1. Create HTTP Connection (Description: Creates HTTP client connection)

**Steps:**
1. Click on the "WSO2 Integrator: BI" tab in the sidebar
2. Verify the project tree shows "TestIntegration" project
3. Click on the "Add Artifact" button
4. Verify the Artifacts menu is displayed
5. Under "Other Artifacts" section, click on "Connection" option
6. Verify the "Connectors" section is displayed
7. Verify available connectors are listed (HTTP, GraphQL, MySQL, MongoDB, etc.)
8. Under "Network" section, click on "HTTP" connector
9. Verify the "Configure the HTTP Connector" form is displayed
10. Enter a URL (e.g., "https://api.example.com") in the "Url" field
11. (Optional) Click on "Advanced Configurations" to expand the section
12. Verify "Connection Name" field defaults to "httpClient"
13. (Optional) Modify the "Connection Name" to a custom value
14. Click on the "Create" button
15. Verify the HTTP Connection is created and the connection configuration view is displayed
16. Verify the connection name is displayed
17. Verify the URL is displayed
18. Verify the tree view shows the connection name under "Connections" section

**Expected Result:** An HTTP Connection is successfully created with the specified URL and connection name.

### 2. Edit Connection URL (Description: Modify connection URL)

**Steps:**
1. Navigate to an existing Connection in the connection configuration view
2. Click on the "Configure" button (⚙️ icon) next to the connection name (or click on the connection in the tree view)
3. Verify the connection configuration form is displayed
4. Locate the "Url" field and modify the URL (e.g., change from "https://api.example.com" to "https://api.newdomain.com")
5. (Optional) Toggle between "Text" and "Expression" modes if needed
6. Click on the "Save" button
7. Verify the connection configuration view reflects the updated URL

**Expected Result:** The Connection URL is successfully updated.

### 3. Configure auth settings (Description: Add authentication config)

**Steps:**
1. Navigate to an existing Connection in the connection configuration view
2. Click on the "Configure" button (⚙️ icon) next to the connection name
3. Verify the connection configuration form is displayed
4. Click on "Advanced Configurations" to expand the section
5. Locate the "Auth" field
6. Toggle to "Record" mode (if not already selected)
7. Verify a dialog or form appears for authentication configuration
8. Select an authentication type (e.g., "Basic", "Bearer Token", "OAuth2")
9. Enter authentication details based on the selected type:
   - For Basic: Username and Password
   - For Bearer Token: Token value
   - For OAuth2: Client ID, Client Secret, Token URL, etc.
10. Click "Save" or "Add" to confirm the authentication configuration
11. Verify the "Auth" field shows the configured authentication
12. Click on the "Save" button to save the connection
13. Verify the connection configuration view reflects the authentication settings

**Expected Result:** Authentication settings are successfully configured for the connection.

### 4. Delete Connection (Description: Remove connection and verify cleanup)

**Steps:**
1. Navigate to an existing Connection in the connection configuration view
2. Click on the "Delete" button (🗑️ icon) next to the connection name
3. Confirm the deletion in the dialog (if any)
4. Verify the Connection is removed from the project tree
5. Verify the Connection is removed from the "Connections" section
6. Verify the connection configuration view is closed

**Expected Result:** The Connection is successfully deleted and removed from the project.

