var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var babel = require('gulp-babel');

// Lint JS
gulp.task('lint', function () {
    return gulp.src('src/js/*.js')
        .pipe(plugins.jshint())
        .pipe(plugins.jshint.reporter('jshint-stylish'))
        .pipe(plugins.jshint.reporter('fail'));
});

// Concatenate our JS
gulp.task('scripts', function () {
    return gulp.src('static/src/js/**/*.js')
        .pipe(babel({
            presets: ['es2015']
        }))
        .pipe(plugins.uglify().on('error', function (e) {
            console.log(e);
        }))
        .pipe(plugins.rename({ suffix: '.min' }))
        .pipe(gulp.dest('static/dist/js'));
});

// Concatenate vendor JS
gulp.task('vendor-js', function () {
    var filterJS = plugins.filter('**/*.js', { restore: true });

    return gulp.src('./bower.json')
        .pipe(plugins.mainBowerFiles({
            overrides: {
                // gentelella
                gentelella: {
                    main: [
                        './vendors/jquery/dist/jquery.min.js',
                        './vendors/bootstrap/dist/js/bootstrap.min.js',
                        './vendors/fastclick/lib/fastclick.js',
                        './vendors/nprogress/nprogress.js',
                        './vendors/pnotify/dist/pnotify.js',
                        './vendors/pnotify/dist/pnotify.buttons.js',
                        './vendors/moment/moment.js',
                        './production/js/datepicker/daterangepicker.js',
                        './vendors/datatables.net/js/jquery.dataTables.min.js',
                        './vendors/datatables.net-bs/js/dataTables.bootstrap.min.js',
                        './vendors/select2/dist/js/select2.full.min.js'
                    ]
                }
            }
        }))
        .pipe(filterJS)
        .pipe(plugins.concat('vendor.min.js'))
        .pipe(plugins.uglify())
        .pipe(gulp.dest('static/dist/js/'));
});

// Move over vendor CSS
gulp.task('vendor-css', function () {
    var filterCSS = plugins.filter('**/*.css', { restore: true });

    return gulp.src('./bower.json')
        .pipe(plugins.mainBowerFiles({
            overrides: {
                // gentelella
                gentelella: {
                    main: [
                        './vendors/bootstrap/dist/css/bootstrap.min.css',
                        './vendors/font-awesome/css/font-awesome.css',
                        './vendors/pnotify/dist/pnotify.css',
                        './vendors/pnotify/dist/*.css',
                        './vendors/bootstrap-progressbar/css/bootstrap-progressbar-3.3.4.min.css',
                        './vendors/datatables.net-bs/css/dataTables.bootstrap.min.css',
                        './vendors/select2/dist/css/select2.min.css',
                    ]
                }
            }
        }))
        .pipe(filterCSS)
        .pipe(plugins.concat('vendor.min.css'))
        .pipe(gulp.dest('static/dist/css'));
});

// Move over custom fonts
gulp.task('fonts', function () {
    return gulp.src('src/fonts/*')
        .pipe(gulp.dest('static/dist/fonts'));
});

// Move over vendor fonts
gulp.task('vendor-fonts', function () {
    return gulp.src('./bower.json')
        .pipe(plugins.mainBowerFiles({
            overrides: {
                // gentelella
                gentelella: {
                    main: [
                        './vendors/font-awesome/fonts/fontawesome-webfont.woff',
                        './vendors/bootstrap/dist/fonts/glyphicons-halflings-regular.woff2',
                        './vendors/font-awesome/fonts/fontawesome-webfont.woff2'
                    ]
                }
            }
        }))
        .pipe(plugins.rename({ dirname: '' }))
        .pipe(gulp.dest('static/dist/fonts'));
});

// Process and minimize SASS -> CSS
gulp.task('sass', function () {
    return plugins.rubySass('static/src/scss/custom.scss', { style: 'compressed' })
        .pipe(plugins.rename({ suffix: '.min' }))
        .pipe(gulp.dest('static/dist/css'));
});

// Optimize images
gulp.task('images', function () {
    return gulp.src('static/src/img/**/*')
        .pipe(gulp.dest('static/dist/img'));
});

// Watch for changes and automatically rebuild
gulp.task('watch', function () {
    // JS changes
    gulp.watch('static/src/js/**/*.js', ['lint', 'scripts']);

    // SCSS changes
    gulp.watch('static/src/scss/*.scss', ['sass']);

    // Image changes
    gulp.watch('static/src/images/**/*', ['images']);

    // Font changes
    gulp.watch('static/src/fonts/*', ['fonts']);

    // Vendor JS
    gulp.watch(['bower.json', 'bower_modules/**/*'], ['vendor-js', 'vendor-css', 'vendor-fonts']);
});

// Default
gulp.task('default', ['lint', 'vendor-js', 'vendor-css', 'vendor-fonts', 'fonts', 'scripts', 'sass', 'images', 'watch']);
