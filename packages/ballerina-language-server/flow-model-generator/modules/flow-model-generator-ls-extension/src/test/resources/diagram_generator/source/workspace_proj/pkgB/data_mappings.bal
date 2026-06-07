public function mapToExternalCustomer(Customer customer) returns ExternalCustomer => {
    customerId: customer.id,
    fullName: customer.name,
    contactEmail: customer.email
};
