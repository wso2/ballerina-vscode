type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
   boolean isUnderGrad;
   string[] courses;
   int age;
   decimal gpa;
   float height;
|};