const readline = require('readline-sync');
const chalk = require('chalk');
const utils = require('../../utils/utils.js');
const vtexConfig = require('../../vtex.config.json');

class Input {

    constructor() {

        this.content = {
            project_name: "",
            email: ""
        };

    }

    askYourNameProject() {

        const answer = readline.question('What is your project name? ');

        if (answer) {

            return answer;

        } else {

            this.askYourNameProject();

        }
    }

    askYourEmail() {
        return readline.questionEMail('What is your email? ');
    }

    askEnvironmentCheckout() {
        if (!vtexConfig.checkoutRulesEnv[this.content.project_name]) {
            console.log('=================================================================================================================================')
            console.log('> Please, insert the infos of Checkout Rules Environment to project "' + this.content.project_name + '" in "./vtex.config.js" :(')
            console.log('=================================================================================================================================')
            process.exit();
        }

        return readline.question('What is environment Checkout? ('+ vtexConfig.checkoutRulesEnv[this.content.project_name] +')');
    }

    printInfos(content) {
        console.log("\nProject name: " + content.project_name + "\nEmail: " + content.email + "\nCheckout: " + content.environment_checkout + "\n");
    }

    confirmItsCorrectInfos() {

        if (!readline.keyInYN(chalk.yellow('The infos of access is correct?'))) {
            // Key that is not `Y` was pressed.
            utils.deleteFileCache();
            // this.asks();
            process.exit();
        }

    }

    askYourCodeConfirmation(input) {

        const answer = readline.question(chalk.green(`\n:) Now just enter the code you received in ${input.email}: `));

        if (answer) {

            return answer;

        } else {

            this.askYourCodeConfirmation(input);

        }

    }

    confirmYoursInfos(content){

        this.printInfos(content);
        this.confirmItsCorrectInfos();

    }

    asks() {

        this.content.project_name = this.askYourNameProject();
        this.content.email = this.askYourEmail();
        this.content.environment_checkout = this.askEnvironmentCheckout() || vtexConfig.checkoutRulesEnv[this.content.project_name];
        this.confirmYoursInfos(this.content);

        return this.content;

    }

}

module.exports = Input;
