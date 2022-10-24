# Data Transformation with Ballerina 

Data transformation is the process of converting data from one format or structure into another. If you are writing enterprise applications or doing data integrations it is most likely that a significant part of the code you write relates to data transformations. Even for a simple scenario like creating a data service you would need to do transformations from db table structures to service responses which are usually asymmetric. 

Ballerina is a multi paradigm language. With Ballerina you can write the data transformation logic in an imperative manner. But Ballerina comes with a special set of language features that will help you to write the transformation logic declaratively. By writing transformation logic declaratively you can make the code more readable and maintainable. On top of that Ballerina VSCode plugin comes with a data mapping tool which will help you to view and implement these transformations graphically. 

## Writing data transformations in Ballerina. 

Let's take the following example where you have to transform the Person and a list of courses to a student record. At start you would have the following data in json format. 

```json
// Input
{
    "person":{
        "id": 1001,
        "firstName": "Vinnie",
        "lastName": "Hickman"
    },
    "course": [
        {
            "id": "CS6002",
            "title": "Computation Structures",
            "credits": 4
        },
        {
            "id": "CS6003",
            "title": "Circuits and Electronics",
            "credits": 3
        },
        {
            "id": "CS6004",
            "title": "Signals and Systems",
            "credits": 3
        }
    ]
}

//Output - Student
{
    "id": 1001,
    "fullName": "Vinnie Hickman",
    "cources": [
        "CS6002 - Computation Structures",
        "CS6003 - Circuits and Electronics",
        "CS6004 - Signals and Systems"
    ],
    "totalCredits": 10
}

```

Create a package if you are not already working on one. 

`bal new convert`

Open package with VSCode. Make sure you have installed latest VSCode plugin and latest **Ballerina version ( 2201.2.1+)**

In Ballerina the preferred way to model the transformation logic is via expression bodied functions. Let's start with defining an empty expression bodied function

```ballerina
function name() => ();
```

Above we have defined an expression bodied function which will simply return nil. Here the function body is an expression which will return a nil value. 

Once you add the above function the VSCode plugin will display a code lens called `Design`  on top of the function. Click the design code lens to go to the Data mapper view. 

![Open Data Mapper](images/goto-design-view.gif "Open Data Mapper via code lens") 

Once the data mapper is opened it will prompt you to provide input and output of the transformation function. The input and output can be any data type in Ballerina. In the example we are converting json to json hence we can use Ballerina record types and input and output. 

In data mapper form you have several options to provide input and output. If the records are already defined in your package you can select one of those. If you are starting from scratch you can either create the record from record editor view or import a json to create a matching record. For this example I will import json files and create records. 

Giff
 

### Basic mapping 

### Diagnostics and fixing errors 

### Adding an expressions 

### Mapping arrays 
