const config = require('../../config/config.js');
const utils = require('../../utils/utils.js');
const Input = require('./input.js');
const request = require('request');

class Auth {

    constructor() {

        this.input = new Input();

    }

    async getAuthenticationToken(input) {

        const spinner = utils.startLoading('Getting of token, waiting....', 'yellow');

        return await new Promise((resolve, reject) => {

            request.get({
                'url': config.urls.auth.start(input),
                'timeout': 2000
            }, (err, httpResponse) => {

                utils.stopLoading(spinner);

                try {

                    if (!httpResponse || httpResponse.statusCode != 200 || err) throw new Error('There was an error catching the Authentication Token!');

                    resolve(httpResponse);

                } catch (e) {

                    reject(e);

                }

            });

        });

    }

    async authenticationValidate(input, token) {

        const spinner = utils.startLoading('Authentication of user, waiting....', 'yellow');

        return await new Promise((resolve, reject) => {

            request.post({
                'url': config.urls.auth.send(input),
                'formData': {
                    'recaptcha': '',
                    'email': input.email,
                    'method': 'POST',
                    'authenticationToken': token,
                },
                'headers': {
                    'Content-Type': 'multipart/form-data'
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                utils.stopLoading(spinner);

                try {

                    if (!httpResponse || httpResponse.statusCode != 200 || err) throw new Error('There was an error while capturing the Validate authentication!');

                    resolve(httpResponse);

                } catch (e) {

                    reject(e);

                }

            });

        });

    }

    async sendCodeConfirmation(input, token) {

        const spinner = utils.startLoading('Sending code of confirmation, waiting....', 'yellow');

        return await new Promise((resolve, reject) => {

            request.post({
                'url': config.urls.auth.validate(input),
                'formData': {
                    'login': input.email,
                    'accesskey': input.accesskey,
                    'method': 'POST',
                    'authenticationToken': token
                },
                'headers': {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                },
                'timeout': 2000
            }, (err, httpResponse) => {

                utils.stopLoading(spinner);

                try {

                    if (!httpResponse || utils.stringToJson(httpResponse.body).authStatus != 'Success' || err) throw new Error('Your validation code is wrong or invalid, please try again! :(');

                    resolve(httpResponse);

                } catch (e) {

                    reject(e);

                }

            });

        });

    }

    async start() {

        return await new Promise(async (resolve, reject) => {

            const file_cache = utils.loadFileCache();

            if (utils.hasFileCache(file_cache)) {

                this.input.confirmYoursInfos(file_cache.input);

                resolve(file_cache);

            } else {

                try {

                    const input = this.input.asks();
                    const token = await this.getAuthenticationToken(input);

                    await this.authenticationValidate(input, utils.stringToJson(token.body).authenticationToken);

                    input.accesskey = this.input.askYourCodeConfirmation(input);

                    const authInfos = await this.sendCodeConfirmation(input, utils.stringToJson(token.body).authenticationToken);

                    utils.saveFileCache(utils.contentVtexSettings(input, utils.stringToJson(token.body).authenticationToken, utils.stringToJson(authInfos.body)));

                    resolve({
                        input: input,
                        token: utils.stringToJson(token.body).authenticationToken,
                        authenticationInfo: utils.stringToJson(authInfos.body)
                    })

                } catch (e) {

                    reject(e);

                }

            }

        });

    }

}

module.exports = Auth
