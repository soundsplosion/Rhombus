var gulp = require("gulp");

var concat = require("gulp-concat");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");

gulp.task("make", function() {
  return gulp.src([
    "src/rhombus.header.js",
    "src/rhombus.util.js",
    "src/rhombus.graph.js",
    "src/rhombus.param.js",
    "src/rhombus.instrument.js",
    "src/rhombus.instrument.sampler.js",
    "src/rhombus.instrument.tone.js",
    "src/rhombus.effect.js",
    "src/rhombus.effect.tone.js",
    "src/rhombus.effect.master.js",
    "src/rhombus.pattern.js",
    "src/rhombus.track.js",
    "src/rhombus.song.js",
    "src/rhombus.time.js",
    "src/rhombus.edit.js",
    "src/rhombus.undo.js",
    ])
    .pipe(concat("rhombus.js"))
    .pipe(gulp.dest("build"))

// we can uncomment these lines in the future to restore
// the minified version.  
/*
    .pipe(rename("rhombus.min.js"))
    .pipe(uglify().on('error', function() {
      console.log("error uglifying Rhombus");
      this.emit('end');
    }))
    .pipe(gulp.dest("build"));
*/
});

gulp.task("watch", function() {
  gulp.watch("src/*.js", ["make"]);
});

gulp.task("default", ["make", "watch"]);
