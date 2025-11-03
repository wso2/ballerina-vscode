type Student record {
    int id;
    string studentName;
    int age;
    string gender;
    string[] semesterGPA;
    string academicMajor;
    Student[] roommates;
    string address;
};

type PersonalProfile record {
    int id;
    Bio bio;
    AcademicRecord academicRecord;
    Accommodation accommodationDetails;
};

type Bio record {
    string name;
    string gender;
    int age;
};

type AcademicRecord record {
    string major;
    string[] semesterGPA;
};

type Accommodation record {
    int numberOfRoomates;
    string address;
};
