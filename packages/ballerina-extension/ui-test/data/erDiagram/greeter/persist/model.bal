import ballerina/persist as _;
import ballerina/time;

type Employee record {|
   readonly string empNo;
   string firstName;
   string lastName;
   time:Date birthDate;
   string gender;
   time:Date hireDate;


   Department department;
   Department2 department2;
   Workspace workspace;
   Team team;
   Team2 team2;
|};

type Employee2 record {|
   readonly string empNo;
   string firstName;
   string lastName;
   time:Date birthDate;
   string gender;
   time:Date hireDate;


   Department department;
   Department2 department2;
   Workspace workspace;
   Team team;
   Team2 team2;
|};

type Workspace record {|
   readonly string workspaceId;
   string workspaceType;


   Building location;
   Employee[] employees;
   Building2 location2;
   Employee2? employee2;
|};


type Building record {|
   readonly string buildingCode;
   string city;
   string state;
   string country;
   string postalCode;
   string 'type;


   Workspace[] workspaces;
|};

type Building2 record {|
   readonly string buildingCode;
   string city;
   string state;
   string country;
   string postalCode;
   string 'type;


   Workspace[] workspaces;
|};


type Department record {|
   readonly string deptNo;
   string deptName;


   Employee[] employees;
   Employee2? employee2;
|};

type Department2 record {|
   readonly string deptNo;
   string deptName;


   Employee[] employees;
   Employee2? employee2;
|};


type Team record {|
   readonly string teamId;
   string teamName;
   Employee[] employees;
   Employee2? employee2;
|};


type Team2 record {|
   readonly string teamId;
   string teamName;
   Employee[] employees;
   Employee2? employee2;
|};
