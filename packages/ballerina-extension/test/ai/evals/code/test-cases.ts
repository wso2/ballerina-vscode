// For development/testing: Set this to a small number (e.g., 1) for faster execution
const MAX_TEST_CASES = process.env.AI_TEST_ENV === 'true' ? 1 : undefined;

const allTestCases = [
  {
    prompt: "write an integration to get emails of the Users from a mysql table and send an email using gmail connector saying that you for buying the product",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "write an integration to Sync a folder in google drive to microsoft one drive",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Write an http service to read a specified csv file and add it to google sheet.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Write an application to read open github issues in a given repo and send those as a message to a slack channel.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Write an application to todos from a csv file and create github issues for each todo.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Read a CSV file from the local system and upload its content to a Google Sheets document.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Fetch the latest issues from a GitHub repository and send a summary to a Slack channel.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Download a file from a specific GitHub repository and save it to a local directory.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Read data from a Google Sheets document and convert it into a CSV file stored locally.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Monitor a Google Sheets document for changes and send an alert to a Slack channel whenever an update is detected.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Export the data from a Slack channel conversation to a Google Sheets document.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Read a list of users from a CSV file and add them to a specific Slack channel.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Fetch pull requests from a GitHub repository and log the details into a local CSV file.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Sync a Google Sheets document with a CSV file on the local system, ensuring both have the same content.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Extract user information from a Slack workspace and store it in a Google Sheets document.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Send notifications to a Slack channel whenever a new file is added to a specific GitHub repository.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Read data from a local CSV file and update corresponding rows in a Google Sheets document.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Automatically post updates to a Slack channel and google sheets whenever a new issue is created in a GitHub repository.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Upload a local CSV file to a specific Google Sheets document, appending the data to the existing sheet.",
    projectPath: "fresh_bi_package"
  },
  {
    prompt: "Generate a CSV report from Google Sheets data and send the report to a Slack channel.",
    projectPath: "fresh_bi_package"
  }
];

export const testCases = MAX_TEST_CASES ? allTestCases.slice(0, MAX_TEST_CASES) : allTestCases;
