type InputErrorDetail record {|
    int errorCode;
    string errorMessage;
|};

type Error error<InputErrorDetail>;
