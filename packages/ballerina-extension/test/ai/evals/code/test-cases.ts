// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

export const initialTestCases = [
  {
    prompt: "write an integration to get emails of the Users from a mysql table and send an email using gmail connector saying that you for buying the product",
    projectPath: "bi_init"
  },
  {
    prompt: "write an integration to Sync a folder in google drive to microsoft one drive",
    projectPath: "bi_init"
  },
  {
    prompt: "Write an http service to read a specified csv file and add it to google sheet.",
    projectPath: "bi_init"
  },
  {
    prompt: "Write an application to read open github issues in a given repo and send those as a message to a slack channel.",
    projectPath: "bi_init"
  },
  {
    prompt: "Write an application to todos from a csv file and create github issues for each todo.",
    projectPath: "bi_init"
  },
  {
    prompt: "Read a CSV file from the local system and upload its content to a Google Sheets document.",
    projectPath: "bi_init"
  },
  {
    prompt: "Fetch the latest issues from a GitHub repository and send a summary to a Slack channel.",
    projectPath: "bi_init"
  },
  {
    prompt: "Download a file from a specific GitHub repository and save it to a local directory.",
    projectPath: "bi_init"
  },
  {
    prompt: "Read data from a Google Sheets document and convert it into a CSV file stored locally.",
    projectPath: "bi_init"
  },
  {
    prompt: "Monitor a Google Sheets document for changes and send an alert to a Slack channel whenever an update is detected.",
    projectPath: "bi_init"
  },
  {
    prompt: "Export the data from a Slack channel conversation to a Google Sheets document.",
    projectPath: "bi_init"
  },
  {
    prompt: "Read a list of users from a CSV file and add them to a specific Slack channel.",
    projectPath: "bi_init"
  },
  {
    prompt: "Fetch pull requests from a GitHub repository and log the details into a local CSV file.",
    projectPath: "bi_init"
  },
  {
    prompt: "Sync a Google Sheets document with a CSV file on the local system, ensuring both have the same content.",
    projectPath: "bi_init"
  },
  {
    prompt: "Extract user information from a Slack workspace and store it in a Google Sheets document.",
    projectPath: "bi_init"
  },
  {
    prompt: "Send notifications to a Slack channel whenever a new file is added to a specific GitHub repository.",
    projectPath: "bi_init"
  },
  {
    prompt: "Read data from a local CSV file and update corresponding rows in a Google Sheets document.",
    projectPath: "bi_init"
  },
  {
    prompt: "Automatically post updates to a Slack channel and google sheets whenever a new issue is created in a GitHub repository.",
    projectPath: "bi_init"
  },
  {
    prompt: "Upload a local CSV file to a specific Google Sheets document, appending the data to the existing sheet.",
    projectPath: "bi_init"
  },
  {
    prompt: "Generate a CSV report from Google Sheets data and send the report to a Slack channel.",
    projectPath: "bi_init"
  },
];

export const httpTestCases = [
  {
    prompt: "Expose a POST /orders service that accepts a JSON order with items and customerId. Validate the payload and call an external Inventory API GET /inventory/items/{sku}?warehouse={code}&expand=pricing to check stock, passing Authorization: Bearer <token> and X-Request-ID from the incoming request. If all items are in stock, create a shipment via Shipping API POST /shipping/shipments?priority={level} and include Idempotency-Key and X-Correlation-ID headers. If Shipping returns 409, retry once with the same Idempotency-Key. Return 201 with the combined order+shipment JSON; otherwise return 422 detailing which SKUs failed.",
    projectPath: "bi_init"
  },
  {
    prompt: "Provide a webhook endpoint POST /crm/events that receives ‘customer.updated’ events. For each event, fetch the latest profile from CRM via GET /crm/customers/{customerId}?include=addresses,subscriptions with Authorization: Bearer <token>. Use the ETag from that GET to update our user store via PUT /users/{customerId} including If-Match: <etag>. If the PUT returns 412, re-fetch and retry once. If the customer unsubscribed, also call Marketing API DELETE /lists/{listId}/members?email={email} with X-Correlation-ID. Return 200 only after all downstream calls complete; otherwise 207 with per-step results.",
    projectPath: "bi_init"
  },
  {
    prompt: "Expose POST /documents/{projectId}/upload that accepts multipart/form-data with file and meta fields. After storing the file, send it to OCR via external POST /v1/ocr?lang=en&enhance=true with headers API-Key: <key>, X-Signature: <hmac>, and a JSON body referencing our file URL. OCR returns 202 with a jobId—poll GET /v1/ocr/jobs/{jobId}?wait=false every 5s (max 6 tries) until status=done or failed. On success, PATCH our Project API /projects/{projectId}/docs/{docId} with extractedText and set status=‘processed’. If polling times out, return 202 with a callback URL GET /documents/{projectId}/status/{docId}.",
    projectPath: "bi_init"
  },
  {
    prompt: "Implement GET /search that aggregates two providers: CatalogA GET /v1/catalog/search?q={query}&limit={n}&page={p} and CatalogB GET /v2/items?query={query}&sort={sort}&price_min={min}&price_max={max}. Forward client header X-Client-Version, set Accept: application/json, and support optional If-Modified-Since from the caller; pass conditional headers through to providers (use If-Modified-Since / If-None-Match when available). Merge results, de-duplicate by itemId, and return a normalized JSON schema. If any provider returns 429, back off (exponential) up to 2 retries and include a warnings array with provider names and retry counts.",
    projectPath: "bi_init"
  },
  {
    prompt: "Create a scheduled automation (every weekday 08:00) that calls Calendar API GET /calendar/{userId}/events?from={ISO}&to={ISO}&includeCancelled=false with Authorization: Bearer <token>. Summarize upcoming events and post to a team chat webhook via POST /hooks/{teamId}?channel={channel}&notify=true with Content-Type: application/json and X-Correlation-ID. If an event has location ‘TBD’, update it via PUT /calendar/{userId}/events/{eventId} with a placeholder location and header Prefer: return=minimal. Also clean old reminders using DELETE /reminders/{reminderId}?hard=false. Return a run report (counts per action) as the HTTP response of a local GET /health/last-run.",
    projectPath: "bi_init"
  },
]

export const textEditSpecializedTestCases = [
  {
    // Covers: 1 (Look into files), 3 (Create new file)
    // This prompt requires the copilot to understand where to place specific configurations (`connections.bal`, `config.bal`),
    // handle data mapping logic (`data_mappings.bal`), and also create a completely new file (`salesforce_listener.bal`) for the service logic.
    prompt: "Create an integration that listens for new 'Account' objects in Salesforce. When a new account is created, transform its data and create a 'Business Partner' in an SAP S/4HANA system. The SAP connection details should go into `connections.bal`, Salesforce credentials into `config.bal`, and the data transformation logic into `data_mappings.bal`. The main listener service must be in a new file named `salesforce_listener.bal`.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 2 (Delete/Replace file content)
    // This prompt forces the copilot to replace the entire content of specific files (`data_mappings.bal`, `types.bal`)
    // by explicitly telling it they are not needed, while correctly populating others (`schedule.bal`, `connections.bal`).
    prompt: "I need a program to sync events from my primary Google Calendar to my Outlook Calendar for the upcoming week. This should be a scheduled job defined in `schedule.bal`. Initialize the necessary Google Calendar and Outlook clients in `connections.bal`. For this task, please ensure the `data_mappings.bal` and `types.bal` files are completely empty, as no complex transformations are required.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 4 (Delete a specific part of code)
    // This prompt tests the ability to generate a standard workflow but intentionally omit a critical part (database logic).
    // The copilot must understand the context and remove what would normally be an essential step in an order processing API.
    prompt: "Develop an HTTP API for processing e-commerce orders. The API in `main.bal` should accept a POST request with order data, validate its structure using a definition from `types.bal`, and send a confirmation email via SendGrid using a function in `functions.bal`. However, for this initial version, please implement the full flow but specifically omit the database insertion step.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 3 (Create new file), 4 (Delete a specific part of code)
    // This is a multi-faceted prompt that involves creating a new file (`logging.bal`) and also omitting standard code (error handling),
    // testing the copilot's ability to follow precise negative constraints.
    prompt: "Write a service that polls for new tickets in Zendesk every 5 minutes. For each ticket, create a corresponding issue in a Jira project. Put the Zendesk and Jira client configs in `connections.bal` and the ticket-to-issue mapping in `data_mappings.bal`. Create a new file `logging.bal` for a function that logs the ID of the created Jira issue. Importantly, the main polling logic in `main.bal` should not include any error handling for the Jira API call.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 3 (Create new file)
    // This test case involves a different protocol (MQTT) and database type (InfluxDB), testing the breadth of the copilot's knowledge.
    // It requires creating a new file for the listener and correctly segregating connection configurations.
    prompt: "Develop an application that listens to an MQTT topic for temperature sensor data. This listener logic should be in a new file named `mqtt_listener.bal`. When a message arrives with a temperature reading above 35°C, insert a record into an InfluxDB database. All MQTT and InfluxDB connection details must be managed in the `connections.bal` file.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files)
    // A practical healthcare integration use case that heavily relies on placing complex type definitions in the correct file (`types.bal`)
    // and separating database logic (`connections.bal`) from the service logic (`main.bal`).
    prompt: "Build an HTTP service to receive patient data compliant with the FHIR standard. The service in `main.bal` should expect a POST request. Define the complex FHIR Patient resource structure in `types.bal`. The service must parse the incoming JSON and insert the patient's name and birthdate into a PostgreSQL database, with connection details isolated in `connections.bal`.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 3 (Create new file), 4 (Delete a specific part of code)
    // This prompt tests integration with AWS services and requires the copilot to create a new file for the trigger logic.
    // It also includes a negative constraint to skip data validation, testing the 'delete a specific part' capability.
    prompt: "Create an integration that triggers when a new JSON file containing customer data is uploaded to an AWS S3 bucket. The trigger logic should reside in a new file `s3_service.bal`. Read the customer data from the JSON and add the customer to a Mailchimp audience using a function in `functions.bal`. AWS and Mailchimp credentials must go into `config.bal`. Ensure you skip any validation of the incoming JSON data and process it directly.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 2 (Delete/Replace file content)
    // This prompt tests if the copilot can follow an instruction to consolidate all logic into one file,
    // which implicitly requires it to ensure other specified files (`functions.bal`, `types.bal`) are empty or cleared.
    prompt: "Generate a simple stock price checker. It should be a single HTTP service in `main.bal` that accepts a stock ticker via a query parameter. It must call an external API like Alpha Vantage to get the latest price and return it. Place the API key in `config.bal`. For this simple tool, ensure that `functions.bal` and `types.bal` are left completely empty.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files)
    // A real-world financial integration scenario. This prompt requires the copilot to correctly identify where to put different pieces of logic:
    // the HTTP listener, type definitions for financial data, and the QuickBooks client configuration.
    prompt: "Write an HTTP service that acts as a webhook for Stripe. When a 'charge.succeeded' event is received, extract the charge amount and customer ID. Then, create a new sales receipt in QuickBooks Online. The webhook service should be in `main.bal`, the Stripe event structure in `types.bal`, and the QuickBooks client initialization in `connections.bal`.",
    projectPath: "bi_empty_project"
  },
  {
    // Covers: 1 (Look into files), 2 (Delete/Replace file content), 3 (Create new file)
    // This prompt combines multiple requirements: create a new file, populate specific files with configurations,
    // and explicitly clear another file (`main.bal`) because the logic is agent-based, not a service.
    prompt: "Set up a daily scheduled task in `schedule.bal` to fetch the top 10 'help wanted' posts from the Hacker News API. For each post, summarize its title and URL and send the summary to a Discord channel via a webhook. Create a new file `utils.bal` containing a function to format the Discord message. The webhook URL should be in `config.bal`. Ensure the `main.bal` file remains empty as this is not an HTTP service.",
    projectPath: "bi_empty_project"
  }
];

export const testCasesForExistingProject = [
  {
    prompt: "How can I implement distributed tracing with OpenTelemetry across the order service saga, ensuring that trace contexts are properly propagated through Kafka events and database transactions while maintaining correlation IDs for debugging payment and fulfillment failures?",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "I need to refactor the current synchronous order creation flow to support asynchronous batch processing with dead letter queues for failed orders, implementing circuit breaker patterns for the pricing service calls and adding retry mechanisms with exponential backoff for Kafka publishing failures.",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "Can you help me implement a comprehensive audit trail system that captures all order state transitions in a separate audit table, with event versioning for schema evolution and integration with a time-series database for real-time monitoring dashboards and alerting on order processing anomalies?",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "I want to replace the current mock pricing calculation with a proper integration to an external pricing microservice using gRPC, implementing request/response caching with Redis, connection pooling with health checks, and graceful degradation when the pricing service is unavailable.",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "How do I implement proper compensating transactions for the order saga pattern, including automatic rollback mechanisms when payment fails, inventory reservation cancellation, and notification service integration with idempotent operations to handle duplicate events during saga recovery?",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "Add comprehensive API documentation with examples for all REST endpoints, including request/response schemas and error handling scenarios.",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "Change the database schema to store order lines in a separate order_lines table with a foreign key relationship instead of storing them as JSON in the orders table.",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "Fix the bug where the getOrderById function returns an empty response instead of a proper error when the database connection fails.",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "Add a new REST endpoint to cancel an existing order by updating its status to 'CANCELLED' and publishing a cancellation event to Kafka.",
    projectPath: "simple_order_management_system"
  },
  {
    prompt: "Add validation to ensure the order total amount is greater than zero before creating an order in the system.",
    projectPath: "simple_order_management_system"
  }
];

export const testCasesForExistingSemanticErrors = [
  {
    prompt: "Change the Kafka broker Url into port 8080",
    projectPath: "simple_order_management_system_with_compile_errors"
  },
  {
    prompt: "I need to store the customer address details inside the order record",
    projectPath: "simple_order_management_system_with_compile_errors"
  },
  {
    prompt: "I need to send an email for the customer when the order is created",
    projectPath: "simple_order_management_system_with_compile_errors"
  },
  {
    prompt: "Please change the database as MsSQL",
    projectPath: "simple_order_management_system_with_compile_errors"
  },
  {
    prompt: "Please add logs for the `getOrderById` function",
    projectPath: "simple_order_management_system_with_compile_errors"
  }
];

export const langlibTestCases = [
 {
   // cloneWithType(), trim(), toLowerAscii(), toJson(), string.length(), indexOf(), substring(), message()
   prompt: "Build a service that reads customer data from a JSON file, removes extra spaces from names, converts all email addresses to lowercase, filters out customers from blocked domains, and exports the cleaned data back to JSON format for CRM import.",
   projectPath: "bi_init"
 },
 {
   // toString(), fromBase64(), message(), fromBytes(), ‘join(), endsWith(), replaceAll(), message(), string.length()
   prompt: "Develop an integration that receives base64 encoded files, decodes them to text, removes special characters, checks if filenames end with specific extensions, combines multiple file contents with separators, and uploads the merged data as JSON to cloud storage.",
   projectPath: "bi_init"
 },
 {
   // array.length(), indexOf(), subString(), push(), filter(), trim(), clone(), cloneReadOnly()
   prompt: "Write a service that processes configuration files, checks which settings exist, lists all available parameter names, finds positions of delimiter characters, extracts values between delimiters, filters empty configurations, and creates typed copies for different environments.",
   projectPath: "bi_init"
 },
 {
   // findAll(), substring(), push(), findGroups(), string.length(), push(), startswith(), fromJsonString(), cloneWithType(), arr.length(), 
   prompt: "Build an integration that scans HTML email content for all URLs, finds the first clickable link, counts total links and XML attachments, parses XML metadata, checks if URLs start with https, deserializes embedded JSON data with type safety, and measures the size of extracted collections.",
   projectPath: "bi_init"
 },
 {
   // toUpperAscii(), cloneReadOnly(), string.length(), 
   prompt: "Create a service that reads product names from inventory, alphabetically compares and arranges them using unicode ordering, removes the oldest and newest entries, converts remaining names to uppercase, creates immutable copies, measures text lengths, and exports as an array structure.",
   projectPath: "bi_init"
 },
 {
   // trim(), replaceAll(), decimal:fromString(), float:fromString(), array:length(), .toString(), message(), push(), 
   prompt: "Develop an API that reads scientific measurements from spreadsheets, converts text values to floating point numbers, applies exponential calculations for growth projections, parses currency amounts, validates data types match requirements, aggregates results, and returns JSON output after trimming whitespace.",
   projectPath: "bi_init"
 },
 {
   // length(), push(), split(), trim(), toLowerAscii(), includes(), keys(), removeAll(), unshift(), cloneReadOnly(), join() 
   prompt: "Write an integration that processes comma-separated log entries, splits them into fields, checks for error keywords, removes sensitive configuration keys conditionally, clears entire cache when needed, prepends priority entries to the front, creates read-only snapshots, combines messages, and finds specific entry positions.",
   projectPath: "bi_init"
 },
 {
   // xml:fromString(), cloneWithType(), fromCodePointInt(), push(), int:fromString(), toString(), length(), message()
   prompt: "Create a service that iterates through XML records from multiple files, merges them into a single document, deserializes typed JSON configurations, generates special unicode characters for formatting, converts character codes to strings, parses numeric IDs, retrieves associated metadata, and outputs combined JSON.",
   projectPath: "bi_init"
 },
 {
   // length(), toCodePointInt(), regexp:fromString(), isFullMatch(), matches(), matchAt(), substring(), push(), toLowerAscii(), trim(), getCodePoint(), fromCodePointInt() 
   prompt: "Build a validation service that examines text input character by character, extracts unicode code points at specific positions, converts characters to numeric codes, validates entire strings match patterns, checks pattern matches at exact locations, filters valid entries, interprets yes/no flags, and generates text reports.",
   projectPath: "bi_init"
 },
 {
   // toLowerAscii(), startsWith(), substring(), int:fromHexString(), findAll(), push(), ensureType(), sort(), keys(), get(), length(), toString(), message()
   prompt: "Develop a sensor data processor that reads hexadecimal encoded temperature values, converts them to readable float format, parses hex device IDs to integers, validates data packet sizes, orders readings chronologically, deserializes JSON metadata, extracts grouped sensor identifiers, and iterates through all key-value pairs for storage.",
   projectPath: "bi_init"
 },
 {
   // toLowerAscii(), findGroups(), length(), push(), substring(), toJson(), toStream(), stream.forEach(), sleep()
   prompt: "Write a polling integration that waits 30 seconds between API calls, retrieves streaming data one record at a time, processes each stream item, normalizes email addresses to lowercase, captures all pattern groups from reference numbers, accumulates results in a collection, and serializes the batch to JSON.",
   projectPath: "bi_init"
 },
 {
   // message(), cause(), detail(), entries(), toString(), push(), length(), startsWith(), toCodePontInt(), int:fromString()
   prompt: "Build a monitoring service that captures exception messages, traces root causes of failures, extracts detailed error information, filters errors starting with specific codes, converts error objects to readable text, parses XML error reports, and retrieves severity levels from configuration for alerting.",
   projectPath: "bi_init"
 },
 {
   // findAll(), decimal:fromString(), substring(), length(), regexp:fromString(), replace(), fromJsonString(), cloneWithType()
   prompt: "Create a text processing service that replaces the first occurrence of placeholder tokens, substitutes all remaining placeholders, extracts specific text portions, aggregates numeric values found in content, calculates totals, deserializes typed JSON templates, combines processed segments, and counts final elements.",
   projectPath: "bi_init"
 },
 {
   // message(), findGroups(), findAllGroups(), toLowerAscii(), includes(), isFullMatch(), matchAt(), find(), substring(), find(), replace(), trim(), replaceAll(), push(), clone(), codePointCompare(), 
   prompt: "Develop a log analysis tool that extracts first matching pattern groups from log lines, captures all pattern groups across entries, checks if lines contain error keywords, identifies lines starting with timestamps, filters relevant entries, sorts messages using unicode comparison, and processes all metadata key-value pairs.",
   projectPath: "bi_init"
 },
 {
   // stream.forEach(), push(), trim(), decimal:fromString(), close(), ‘join(), float:exp(), removeAll(), next(), toJson(), toJsonString(), toStream()
   prompt: "Build a streaming data processor that properly closes data streams after use, retrieves next items individually, processes each stream element, aggregates values across the stream, converts results to JSON, combines text fragments with delimiters, clears temporary cache completely, and applies exponential transformations to metrics.",
   projectPath: "bi_init"
 },


 // Langlib test cases for existing code
 {
   // toLowerAscii(), split(), push(), length(), substring() 
   prompt: "Develop a resource function for processing customers that receives customer data via POST /customers/process endpoint. Parse the incoming JSON payload into typed customer records, export the processed customer data as formatted JSON output, and validate email domains are in lowercase format before storing the customer information.",
   projectPath: "langlib_with_existing_code"
 },
 {
   // message(), cloneWithType(), toJson(), toString(), join(), 
   prompt: "Develop a resource function for the POST /customers endpoint that receives customer data. Parse the incoming JSON payload, convert it to a customer record type, serialize the customer data back to JSON format, and ensure all values are converted to string representations for logging.",
   projectPath: "langlib_with_existing_code"
 },
 {
   // cloneReadOnly(), hasKey(), toString(), toArray(), concat(), get(), ensureType(), push(), cloneWithType()
   prompt: "Develop a resource function for the GET /orders/export endpoint that transforms XML order data into immutable structures, ensures product records cannot be modified after creation, and creates read-only order objects that preserve data consistency.",
   projectPath: "langlib_with_existing_code"
 },
 {
   // fromJsonString(), cloneWithType(), cloneReaadOnly(), stratsWith(), ensureType()
   prompt: "Develop a resource function for the POST /config/validate endpoint that receives configuration data for validation and environment-specific handling. Parse incoming JSON configuration with type safety, validate data structures match expected formats, and create isolated configuration copies for different deployment environments.",
   projectPath: "langlib_with_existing_code"
 },
   {
   // fromJsonString(), cloneWithType(), length(), push(), message(), fromJsonStringWithType()
   prompt: "Develop a resource function for the POST /payments/process endpoint that accepts payment transaction data. Parse the incoming JSON string payload into payment records, validate that payment IDs have the correct length, convert payment records to order-compatible format using type conversion, and capture detailed error messages when validation or conversion fails for proper logging and error response",
   projectPath: "langlib_with_existing_code"
 }
];

export let testCases = [];
testCases.push(...initialTestCases);
testCases.push(...httpTestCases);
testCases.push(...textEditSpecializedTestCases);
testCases.push(...testCasesForExistingProject); 
testCases.push(...testCasesForExistingSemanticErrors);
testCases.push(...langlibTestCases);
