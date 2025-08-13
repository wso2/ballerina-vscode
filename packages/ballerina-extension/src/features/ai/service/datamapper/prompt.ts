// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

/**
 * Generates the main data mapping prompt for AI
 */
export function getDataMappingPrompt(inputJson: string, outputJson: string, mappingFields: string): string {
    return `You are an assistant that can help to map attributes between multiple json (a.k.a data-mapping).
Before starting the mapping process, consider the mappings provided by the user below. 
Use the user's mappings as a guide/tip to do the mapping process, ensuring that they are relevant to input and output json. 
Only use the tips in user's mappings that is input and output records and their fields and subfields are in input and output json. Otherwise omit the irrelevant user's mapping guides.
Also, use the below rules to do the data mapping.

Following rules should be followed during data mapping.   
1) One or more input json can be given 
2) Only a single output json can be given  
3) Mapping the fields requires performing operations on the data. Most common operation is to do a one-to-one mapping with no transformations.   
4) One or more fields in the input json may be required to construct the output field value in-case we have complex operations that require multiple input fields.   
5) Some input fields may not participate in any mappings if they are irrelevant to the output field.   
6) Some output fields may not participate in any mappings if they are irrelevant to the input field.   
7) Accessing the subfield "abc" from object "xyz" can be denoted as "xyz.abc". If the field contains a single quote at the beginning of the field name, include that field with the single quote in front of it in the path.  
8) Strictly follow data types accepted and returned by the operations when mapping input fields.   
9) When mapping, you must use operators which return the expected data type.
10) When Mapping, consider the information mentioned in the comments.
11) DO NOT use the value in the field "optional" when mapping the fields.
12) DO NOT map anything if you aren't sure.     
13) If both input and output are records type, DO mapping for all its fields and subfields but DO NOT map in the root level.

Following operations/transformations can be used during a mapping between input and output fields. Use ONLY the operations listed below.   
0) Direct Mapping 
   DIRECT(x) used to substitute with x without any transformations
1) Arithmetic Expressions  
    1.1) ADDITION(x, y, z, ...) : add variables x, y and z and so on 
    1.2) SUBTRACTION(x, y) : subtract y from x   
    1.3) MULTIPLICATION(x, y, z, ...) : multiply x, y and z and so on  
    1.4) DIVISION(x, y) : divide x by y   
    1.5) MODULAR(x,  y) : get the modular division between x and y i.e. x%y  
2) Equality Expressions  
    2.1) EQUAL(x, y) : return true if x and y are equal   
    2.2) NOTEQUAL(x, y) : return true if x and y are not equal  
3) Relational Expressions  
    3.1) LESS_THAN(x, y) : return true if x is less than y     
    3.2) LESS_THAN_OR_EQUAL(x, y) : return true if x is less than or equals to y      
4) Logical Expressions  
    4.1) AND(x, y) : return x AND y value  
    4.2) OR(x, y) : return x OR y value  
5) Member Access Expressions  
    5.1) x[y] : access y th element of x array object in the json
6) Regex Operations
    6.1) SPLIT(text, regex) : Split the string text based on the regex and returns an array of strings (string[]).
            Example: 
          SPLIT("word1, word2, word3", ",") will return a string array ["word1", "word2", "word3"].
          SPLIT("word1 word2 word3", " ") will return a string array ["word1", "word2", "word3"].
    6.2) REPLACE_ALL(text, regex, replacement) : Replace all the instances of regex in the text using string replacement. 
            Example -  REPLACE_ALL("word1 word2 word3", " ", "") will return a string "word1word2word3"
    For above two operations, regex value must be one or combination of the following : [" ", "_", "-", "\n", ",", "\." ], here "\" is used to escape special characters.

7) Numerical Operations  
    7.1) AVERAGE(x, TYPE) : get the average over x. x is a single array of variables of TYPE (ex - [12, 13, 14]) when TYPE is INTEGER .TYPE can be either INT, DECIMAL, or FLOAT.
    7.2) MAXIMUM(x, TYPE) : get the maximum over x. x is an array of variables of TYPE(ex - [12, 13, 14]) when TYPE is INTEGER .TYPE can be either INT, DECIMAL, or FLOAT.
    7.3) MINIMUM(x, TYPE) : get the minimum over x. x is a single array of variables of TYPE (ex - [12, 13, 14]) when TYPE is INTEGER .TYPE can be either INT, DECIMAL, or FLOAT.
    7.4) SUMMATION(x, TYPE) : get the summation over x. x is a single array of variables of TYPE(ex - [12, 13, 14]) when TYPE is INTEGER .TYPE can be either INT, DECIMAL, or FLOAT.
    7.5) ABSOLUTE(x, TYPE) : get the absolute value of the given variable of TYPE, x .TYPE can be either INT, DECIMAL, or FLOAT.

8) Array Operations
    8.1) LENGTH(x) : Get the length of an array named x

Always use the following json format to respond.  
\`\`\`
{
    "<FIELD_NAME>": {
      "OPERATION": {
        "NAME": "<OPERATION_NAME>",
        "PARAMETER_1" : <PARAMETER_1>,
        "PARAMETER_2" : <PARAMETER_2>,
        ...
        ...
        ...
      }
    },
    ...
}
\`\`\`
Following is an example of the input, output and the mapping:

Example Input json : 

\`\`\`
{
    "studentDetails": {
      "id":{
        "type":"string",
        "optional" : false, 
        "nullable" : false,
        "comment":"student id"
      },
      "tags":{
        "type":"string",
        "optional" : false, 
        "nullable" : false,
        "comment":"student tags"
      },
      "bio":{
        "firstName": {
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"first name of the student"
        },
        "lastName":{
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"Last name of the student"
        },
        "age":{
          "type":"int",
          "optional" : false, 
          "nullable" : false, 
          "comment":"age in years"
        }
      },
      "address":{
        "address1": {
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"address line 1"
        },
        "address2":{
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"address line 2"
        },
        "city":{
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"city of the address"
        },
        "country":{
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"country of residence"
        },
        "zip":{
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"zip code"
        }
      },
      "academicDetails": {
        "major":{
          "type":"string",
          "optional" : false, 
          "nullable" : false, 
          "comment":"major of the degree"
        },
        "subjects":{
          "type":"string[]",
          "optional" : false, 
          "nullable" : false, 
          "comment":"enrolled subjects"
        }
      }
    },
    "studentProgress": {
      "studentId":{
        "type":"string",
        "optional" : false, 
        "nullable" : false, 
        "comment":"student id"
      },
      "currentLevel":{
        "type": "string",
        "optional" : false, 
        "nullable" : false, 
        "comment": "current grade of the student"
      }
    }
}  

\`\`\`

Example Output json : 

\`\`\`
{
    "studentId":{
      "type":"int",
      "optional" : true, 
      "nullable" : true,
      "comment":"reservation id"
    },
    "studentTags":{
        "type":"string[]",
        "optional" : false, 
        "nullable" : false,
        "comment":"student tags"
    },
    "bio":{
      "fullName": {
        "type":"string",
        "optional" : false, 
        "nullable" : false, 
        "comment":"full name of the student"
      },
      "age":{
        "type":"int",
        "optional" : false, 
        "nullable" : false, 
        "comment":"age in years"
      }
    },
    "address":{
      "type":"string",
      "optional" : false, 
      "nullable" : false, 
      "comment":"address of the student"
    },
    "AcademicMajor":{
      "type":"string",
      "optional" : true, 
      "comment":"major of the degree"
    },
    "subjects":{
      "type":"string[]",
      "optional" : false, 
      "nullable" : false, 
      "comment":"enrolled subjects"
    },
    "currentLevel": {
      "type": "string",
      "optional" : true, 
      "nullable" : true,
      "comment": "current grade of the student"
    }
}

\`\`\`

Example Mapping:
\`\`\`
{
    "studentId": {
      "OPERATION": {
        "NAME": "DIRECT",
        "PARAMETER_1": "studentDetails.id",
        "PARAMETER_2": "INT"
      }
    },
    "studentTags": {
      "OPERATION": {
        "NAME": "SPLIT",
        "PARAMETER_1": "studentDetails.tags",
        "PARAMETER_2": ","
      }
    },
    "bio": {
      "fullName": {
        "OPERATION": {
          "NAME": "ADDITION",
          "PARAMETER_1": "studentDetails.bio.firstName",
          "PARAMETER_2": " ",
          "PARAMETER_3": "studentDetails.bio.lastName"
        }
      },
      "age": {
        "OPERATION": {
          "NAME": "DIRECT",
          "PARAMETER_1": "studentDetails.bio.age"
        }
      }
    },
    "address": {
      "OPERATION": {
        "NAME": "ADDITION",
        "PARAMETER_1": "studentDetails.address.address1",
        "PARAMETER_2": ", ",
        "PARAMETER_3": "studentDetails.address.address2",
        "PARAMETER_4": ", ",
        "PARAMETER_5": "studentDetails.address.country",
        "PARAMETER_6": ", ",
        "PARAMETER_7": "studentDetails.address.zip"
      }
    },
    "academicMajor": {
      "OPERATION": {
        "NAME": "DIRECT",
        "PARAMETER_1": "studentDetails.academicDetails.major"
      }
    },
    "subjects": {
      "OPERATION": {
        "NAME": "DIRECT",
        "PARAMETER_1": "studentDetails.academicDetails.subjects"
      }
    },
    "currentLevel": {
      "OPERATION": {
        "NAME": "DIRECT",
        "PARAMETER_1": "studentDetails.studentProgress.currentLevel"
      }
    }
}

\`\`\`
Now using the above rules find the mappings for the following input and output records. 

IMPORTANT : 
DO NOT RETURN ANYTHING OTHER THAN THE MAPPING JSON! 
DO NOT ENCLOSE THE RESULT JSON WITH ANYTHING.
FOR DIRECT MAPPINGS THE PARAMETER MUST BE A FIELD PATH IN THE INPUT. DEFAULT VALUES AND NULL LIKE VALUES MUST NOT BE MAPPED DIRECT.

User's mappings
\`\`\`
${mappingFields}
\`\`\`


Input json
\`\`\`
${inputJson}
\`\`\`


Output json
\`\`\`
${outputJson}
\`\`\`
`;
}
