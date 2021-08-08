const gulp = require('gulp');
const htmlLint = require('gulp-html-linter');
const eslint = require('gulp-eslint');
const utils = require('./utils');

const HTMLint = () => {

    let task = gulp.src([
        utils.srcPath('publish/**/*.html'),
    ]);

    task = task.pipe(htmlLint([{
        htmllintrc: "./htmllintrc",
        useHtmllintrc: true,
        rules: {},
        plugins: [],
        limitFiles: `Number.MAX_VALUE`,
        limitIssuesPerFile: `Number.MAX_VALUE`,
        limitIssues: `Number.MAX_VALUE`,
    }]));

    task = task.pipe(htmlLint.format());
    task = task.pipe(htmlLint.failOnError());

    return task;

};

const ESLint = () => {

    let task = gulp.src(utils.modulePath('**/*.js'));

    task = task.pipe(eslint({
		configFile: '.eslintrc',
        globals: [
            'jQuery',
            '$'
        ],
        envs: [
            'browser'
        ]
    }));

    task = task.pipe(eslint.format());
    // To have the process exit with an error code (1) on
    // lint error, return the stream and pipe to failAfterError last.
    //task = task.pipe(eslint.failAfterError());
    task = task.pipe(eslint.formatEach('compact', process.stderr));

    return task;

};

gulp.task('htmllint', HTMLint);
gulp.task('jslint', ESLint);

gulp.task('htmllint:watch', function () {

    gulp.watch(utils.srcPath('**/*.html'), gulp.series('htmllint'));

});

gulp.task('jslint:watch', function () {

	gulp.watch(utils.modulePath('**/*.js'), gulp.series('jslint'));

});

