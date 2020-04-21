var gulp = require('gulp');
var gutil = require('gulp-util');
var uglifycss = require('gulp-uglifycss')
var zip = require('gulp-zip')

var webpack = require('webpack')
var WEBPACK_CONFIG = require('./webpack.config');

gulp.task('webpack', function (callback) {
    return webpack(WEBPACK_CONFIG, function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack', err);
        }
        gutil.log('[webpack]', stats.toString());
        callback();
    });
});

gulp.task('styles', function () {
    return gulp.src('src/css/*.css')
        .pipe(uglifycss())
        .pipe(gulp.dest('dist/css/'))
})

gulp.task('release', function () {
    return gulp.src([
        'dist/**',
        'manifest.json',
        'icons/**',
        '_locales/**',
        'schema.json',
    ], { base: '.' })
        .pipe(zip('isthislegit-extension.zip'))
        .pipe(gulp.dest('.'))
})

gulp.task('build', gulp.series(['webpack', 'styles']))
exports.default = gulp.series(['build'])
