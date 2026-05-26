
function transform(Person person, Admission admission) returns Employee => {
    name: person.name,
    empId: admission.empId,
    email: person.email,
    location: {
        city: person.address.city,
        country: person.address.country
    }
};

public function processData(string 'order, int 'type, string 'user_name,
        float 'price, boolean 'is\-valid) returns string {
        string result = string `${'order} -> ${'price}`;
        return result;
}
