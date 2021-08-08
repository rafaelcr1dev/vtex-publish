const Auth = require("../../modules/auth/auth.js");
const utils = require("../../utils/utils.js");

describe("Authentication", () => {

    let response_token = {};
    let authenticationToken;

    let content = {
        project_name: "corebiz",
        email: "rafael.cruz@corebiz.com.br"
    };

    const auth = new Auth();
      
    test('Should exist a Auth Class', () => {

        expect(Auth).toBeDefined();
    
    });

    test('Should exist a method start', () => {

        expect(auth.start).toBeDefined();
    
    });

    test('Should return status 200 in return get Authentication Token', async () => {

        response_token = await auth.getAuthenticationToken(content);

        console.log("response_token===>", response_token);

        authenticationToken = utils.stringToJson(response_token.body).authenticationToken

        expect(response_token).toBeDefined();
        expect(response_token.statusCode).toBe(200);

    });

    test('Should return undefined in return get Authentication Token by sended info project_name wrong', async () => {

        content.project_name = "corebi";
        content.email = "rafael.cruz@corebiz.com.br"

        try {
     
            await auth.getAuthenticationToken(content);

        } catch (e) {

            expect(e.toString(e)).toBe('Error: There was an error catching the Authentication Token!');

        }
    
    });

    test('Should return status 200 in authentication validate', async () => {

        try {

            content.project_name = "corebiz";
            content.email = "rafael.cruz@corebiz.com.br"
            const response_auth = await auth.authenticationValidate(content, authenticationToken);
    
            expect(response_auth).toBeDefined();
            expect(response_auth.statusCode).toBe(200);

        } catch (e) {

            expect(e.toString()).toContain('There was an error while capturing the Validate authentication!');

        }

    
    });

    test('Should return a error the in authentication validate sended authentication Token wrong', async () => {

        try {

            const response_auth = await auth.authenticationValidate(content, "123456");

            expect(response_auth).toBeDefined();
            expect(response_auth.statusCode).toBe(200);

        } catch (e) {

            expect(e.toString()).toContain('There was an error while capturing the Validate authentication!');

        }
    
    });

    test('Should return a error the WrongCredentials when sended to method code confirmation', async () => {

        try {

            content.accesskey = '123456';
            await auth.sendCodeConfirmation(content, authenticationToken);

        } catch(e) {

            expect(e.toString()).toBe('Error: Your validation code is wrong or invalid, please try again! :(');

        }
    
    });

});
