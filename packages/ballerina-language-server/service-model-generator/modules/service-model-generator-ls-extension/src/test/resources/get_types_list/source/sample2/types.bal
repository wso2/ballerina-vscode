distinct service class Teacher {
    resource function get name() returns string {
        return "Walter";
    }
}

distinct service class Student {
    *Teacher;
    resource function get name() returns string {
        return "Jessie";
    }
}

type Profile Teacher|Student|();

type TeacherRecord record {
    string name;
};

type StudentRecord record {
    *TeacherRecord;
    int age;
};

type ProfileType TeacherRecord|StudentRecord|();

enum Color {
    RED,
    GREEN,
    BLUE
}
