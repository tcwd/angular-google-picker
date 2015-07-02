var gulp = require('gulp');

var karma = require('karma').server;
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

// Copy non-uglify version to "dist"
gulp.task('copy', ['test'], function () {
  return gulp.src('src/*.js')
    .pipe(gulp.dest('dist'));
});

// Create an uglify version to "dist" and "example"
gulp.task('uglify', ['test'], function () {
  return gulp.src('src/*.js')
    .pipe(uglify())
    .pipe(rename('google-picker.min.js'))
    .pipe(gulp.dest('dist'))
    .pipe(gulp.dest('example'));
});

gulp.task('watch', function () {
  gulp.watch('src/*.js', ['copy', 'uglify']);
});

gulp.task('test', function (done) {
  karma.start({
    configFile: __dirname + '/test/karma.conf.js',
    singleRun: true
  }, done);
});

gulp.task('default', ['test', 'copy', 'uglify']);
