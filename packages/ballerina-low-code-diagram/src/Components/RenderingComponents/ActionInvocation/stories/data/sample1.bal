import ballerinax/googleapis.gmail;

function funcName() returns error? {
    
    gmail:Client gmailEndpoint = check new ({auth: {token: "asdfghj"}});
    gmail:Message _ = check gmailEndpoint->sendMessage({recipient: "someone@gmail.com", subject: "TheSubject", messageBody: "TheMessage"});
}
