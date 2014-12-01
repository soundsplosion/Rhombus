var gulp = require("gulp");

var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");

gulp.task("make", function() {
  return gulp.src([
    "src/rhombus.header.js",
    "src/rhombus.util.js",
    "src/rhombus.instrument.js",
    "src/rhombus.song.js",
    "src/rhombus.time.js"
    ])
    .pipe(concat("rhombus.js"))
    .pipe(gulp.dest("build"))
    .pipe(rename("rhombus.min.js"))
    .pipe(uglify())
    .pipe(gulp.dest("build"));
});

gulp.task("watch", function() {
  gulp.watch("src/*.js", ["make"]);
});

gulp.task("default", ["make", "watch"]);
