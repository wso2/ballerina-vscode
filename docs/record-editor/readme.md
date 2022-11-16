# Edit records graphically with Ballerina

Record is the type system introduced by the Ballerina language to hold data by a user. You can use records when you want to define data schemas. Once the records are created, you can easily manipulate data inside a program.

Ballerina is a multi-paradigm language. You can define records in an imperative manner with Ballerina. On top of that, the Ballerina VS Code plugin comes with record editing capabilities, which will help you to edit records graphically.

In the record editor, you have the ability to create a record from scratch or create a record by importing a JSON.

## Set up the prerequisites

1. Install the latest versions of [Ballerina](https://ballerina.io/downloads/) and [Ballerina Visual Studio Code plugin](https://marketplace.visualstudio.com/items?itemName=wso2.ballerina).

2. Execute the command below to create a package (if you are not already working on one).

    ```bash
    bal new convert
    ```

3. Open the created package in VS Code.

## Create records from scratch

1. Navigate to the record editor and select **Create New**.

    ![Create new record](images/create-new.gif "Create new record via record editor")

2. Double click the default record name to change it.

    ![Change record name](images/change-record-name.png "Change record name via record editor")

3. Click the plus button at the end of the field to add new fields to the record.
>**Info:** Use the **Expressions** tab in the record editor to create nested records by selecting the particular record expression.

    ![Add fields](images/add-fields.gif "Add fields to a record")

4. Select the semicolon(;) of a field and select the default value expression to add default values.

    ![Add default value](images/default-value.gif "Add default value to a field")

5. Select/Deselect the **isClosed** option to switch between the open and closed records.

    ![Open Close](images/open-close-switch.gif "Switch between Open and Closed records")

6. Once the record field configuration is done, click **Save**.

    ![Save create new record](images/save-create-new.gif "Save the newly created record")

## Create records by importing a JSON

The Ballerina language provides an option to convert JSON files into record definitions. Follow the steps below to create a record from a JSON.

1. Create a file with the data below in JSON format.

    >**Info:** The example below converts a `person` and a list of `courses` to a `Student` record. 

    ```json
    {
        "person": {
            "id": 1001,
            "firstName": "Vinnie",
            "lastName": "Hickman",
            "age": 15
        },
        "course": [
            {
                "id": "CS6002",
                "name": "Computation Structures",
                "credits": 4
            },
            {
                "id": "CS6003",
                "name": "Circuits and Electronics",
                "credits": 3
            },
            {
                "id": "CS6004",
                "name": "Signals and Systems",
                "credits": 3
            }
        ]
    }
    ```

2. In the record editor, select the **Import A JSON** option.

3. Provide a name for the record.

4. Provide the sample JSON by either typing on the text area or by choosing the file created from the file selector.

5. Select **Make Separate Record Definitions** to create separate Ballerina record definitions.

    ![Import a JSON](images/import-JSON.gif "Import a JSON from record editor and covert to a record")

6. Use the preview of the created record to edit the created records further, and click **Finish** once editing is complete.

    ![Preview created records](images/preview.png "Preview the created records")
