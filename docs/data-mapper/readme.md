# Data transformation with Ballerina

Data transformation is the process of converting data from one format or structure into another. If you are developing enterprise applications or performing data integrations, it is most likely that a significant part of the code you write relates to data transformations. 

Ballerina is a multi-paradigm language. You can write the data transformation logic in an imperative manner with Ballerina. However, Ballerina comes with a special set of language features that will help you to write the transformation logic declaratively to make the code more readable and maintainable. On top of that, the Ballerina VS Code plugin comes with a data mapping tool, which will help you to view and implement these transformations graphically.

## Set up the prerequisites

1. Create a file with the data below in JSON format.

    >**Info:** The example below transforms a `person` and a list of `courses` to a `student` record. 

    **Input**
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

    **Output - Student**
    ```json
    {
        "id": 1001,
        "fullName": "Vinnie Hickman",
        "age": "15",
        "courses": [
            {"title": "CS6002 - Computation Structures", "credits": 4},
            {"title": "CS6003 - Circuits and Electronics", "credits": 3},
            {"title": "CS6004 - Signals and Systems", "credits": 3}
        ],
        "totalCredits": 10
    }
    ```

2. Install the latest versions of [Ballerina](https://ballerina.io/downloads/) and [Ballerina Visual Studio Code plugin](https://marketplace.visualstudio.com/items?itemName=wso2.ballerina).

3. Execute the command below to create a package (if you are not already working on one).

    ```bash
    bal new convert
    ```

4. Open the created package in VS Code.

## Write data transformation functions

1. Add the code below to the `main.bal` file of the package to define an empty expression bodied function.

    >**Info:** The preferred way to model the transformation logic in Ballerina is via expression bodied functions. The expression bodied function below will simply return nil. The function body of it is an expression, which will return a nil value. 

    ```ballerina
    function name() => ();
    ```

Once you add the above function, the VS Code plugin will display a code lens called `Design`  on top of the function.

2. Click the **Design** code lens to go to the **Data Mapper** view.

    ![Open Data Mapper](images/goto-design-view.gif "Open Data Mapper via code lens")

3. Select the input and output record types.

    Once the data mapper is opened, it will prompt you to provide input and output of the transformation function. The input and output can be any data type in Ballerina. This example converts JSON to JSON, and thereby, you can use Ballerina record types as the input and output. 

    In the **Data Mapper** form, you have several options to provide input and output records. If the records are already defined in your package, you can select one of those. If you are starting from scratch, you can either create the record from the record editor view or import a JSON to create a matching record. 

    This example imports JSON files and creates the records as shown below. 

    ![Configure Data Mapper](images/choose-input-output.gif "Choose Inputs and Output for Data Mapper")

4. Click **Save** to open the mapping view. 

## Explore the data mapper features

### Basic mapping

Map the `person id` to the `student id` as shown below. 

  >**Info:** The mapping view will have the **Inputs** on the left hand side of the screen and the **Output** on the right. To map the fields, click on the input field port and then, click the output field port. If the input and output fields are compatible and can be mapped directly, you will see a solid line connecting them. 

  ![Basic Mapping](images/basic-mapping.gif "Save and do a basic mapping")

### Diagnostics and fixing errors

Use the `toBalString` langlib function to convert the int to string as shown below.

  >**Info:** When you map the input to an output fields, some of them might not be compatible due to type mismatch. In this example, if you map the `person age` to `student` age, it will result in an error for type mismatch since the `input age` type is an integer and `output age` type is string. In this case, the datamapper will connect the two fields with a red line and show an alert sign. You can see the error by hovering over the alert sign. In this case, it will show `incompatible types: expected 'string', found 'int'`. To fix the error, hover over the alert sign and click `Fix by editing expression`. Then, the data mapper will pop out the expression editor for the specific expression. Now, you can modify the expression to return a string. 

  ![Fix Errors](images/fix-diagnostics.gif "Fix incompetible types error")

### Aggregate multiple input fields to one output field

Combine the `firstName` and `lastName` fields to create the `fullName` of the student as shown below.

  >**Info:** To aggregate fields, you can map two or more fields to the same output field. The data mapper will automatically combine the two fields and assign it to the output field. By default, the fields will be combined with a plus operator. If you want to use a different operator or method to combine two fields, you can click on the code button and customize the expression with the expression editor. 

  ![Concatinate](images/concatinate.gif "Aggregate multiple input fields")

### Map the arrays

Click the **Expand query** button to move into the query mapping and use the same mapping techniques to map array types as shown below. 

  >**Info:** To convert from one array type to another, you can simply map the input array to the output array. If the arrays are compatible, they will be connected with a blue line. If they are not compatible, the connecting line will appear in red. 

  >**Info:** You can use Ballerina query support to convert one array type to another. To use a query in a data mapper, you can select the array by clicking on it. Then, it will provide you with several buttons. Click the code action button (bulb sign) and select **Convert to query**. Then, the data mapper will convert the mapping to a query. Then, move into the query and do the mapping between the array types. 

  ![Convert To Query](images/convert-query.gif "Mapping incompatible arrays")

Once array type mapping is completed, select the transform function name in the top breadcrumb bar.
