type DetailedPerson record {
    PersonalDetails personalDetails;
};

type CourseDetails record {
    string courseId;
    string courseName;
    decimal credits;
    string grade;
};

type PersonalDetails record {
    CourseDetails[] courseDetails;
};

type DetailedStudent record {
    Course[] courses;
};

type Course record {
    string id;
    string name;
    float credits;
};

function transform1(DetailedPerson person) returns DetailedStudent|error => {
};
