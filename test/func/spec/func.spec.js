"use strict";

/**
 * Functional tests.
 *
 * These tests are **real** process / fs executions. Use sparingly as these
 * take about 0.5 seconds each.
 *
 * **Note**: Mac/Linux/Unix compatible.
 */
var path = require("path");
var cp = require("child_process");

var _ = require("lodash");
var builder = require.resolve("../../../bin/builder");
var clone = require("../../../lib/utils/clone");

var CWD = path.resolve(__dirname, "..");
var exec = function () {
  var args = [].slice.apply(arguments);
  var cmd = args[0];
  var callback = args[args.length - 1];
  var opts = args.length === 3 ? args[1] : {};
  opts = _.merge({ cwd: CWD }, opts);

  return cp.exec(cmd, opts, callback);
};

var STDERR_SETUP_END_RE = /^(|Terminated\s*)$/i;

describe("functional", function () {

  describe("environment variables", function () {

    it("get environment from package.json:config", function (done) {
      exec("node \"" + builder + "\" run echo --log=debug", function (err, stdout, stderr) {
        if (err) { return done(err); }

        expect(stdout)
          .to.contain("string - hi").and
          .to.contain("builder-core:start");
        expect(stderr).to.equal("");

        done();
      });
    });

    it("overrides package.json:config from environment", function (done) {
      exec("node \"" + builder + "\" run echo", {
        env: _.merge(clone(process.env), {
          npm_package_config__test_message: "over" // eslint-disable-line camelcase
        })
      }, function (err, stdout, stderr) {
        if (err) { return done(err); }

        expect(stdout).to.contain("string - over");
        expect(stderr).to.equal("");
        done();
      });
    });

  });

  describe("logging", function () {

    it("silences logging", function (done) {
      exec("node \"" + builder + "\" run echo --log-level=none", function (err, stdout, stderr) {
        if (err) { return done(err); }

        expect(stdout)
          .to.contain("string - hi").and
          .to.not.contain("builder-core:start");
        expect(stderr).to.equal("");
        done();
      });
    });

  });

  describe("--setup", function () {

    it("runs setup with --env values applied", function (done) {
      exec(
        "node \"" + builder + "\" run sleep -q --setup=echo-forever " +
        "--env=\"{\\\"TEST_MESSAGE\\\":\\\"FROM_ENV\\\"}\" ",
        function (err, stdout, stderr) {
          if (err) { return done(err); }

          expect(stdout).to.contain("ECHO FOREVER - string - FROM_ENV");
          expect(stderr).to.match(STDERR_SETUP_END_RE);
          done();
        });
    });

    it("runs setup with --quiet flag applied", function (done) {
      exec("node \"" + builder + "\" run sleep -q --setup=echo-forever:builder",
        function (err, stdout, stderr) {
          if (err) { return done(err); }

          expect(stdout).to.not.contain("[builder");
          expect(stderr).to.match(STDERR_SETUP_END_RE);
          done();
        });
    });

    it("runs setup with --log-level=debug flag applied", function (done) {
      return exec(
        "node \"" + builder + "\" run sleep --log-level=debug --setup=echo-forever:builder",
        function (err, stdout, stderr) {
          if (err) { return done(err); }

          expect(stdout).to.contain("[builder:proc:start");
          expect(stderr).to.contain("[builder:proc:end");
          done();
        });
    });

    it("runs setup with --log-level=none flag applied", function (done) {
      return exec(
        "node \"" + builder + "\" run sleep --log-level=none --setup=echo-forever:builder",
        function (err, stdout, stderr) {
          if (err) { return done(err); }

          expect(stdout).to.not.contain("[builder");
          expect(stderr).to.match(STDERR_SETUP_END_RE);
          done();
        });
    });

    it("runs setup without --tries flag applied", function (done) {
      var sleepMs = 1000; // Give the sleep a little while to let failures happen.

      return exec(
        "node \"" + builder + "\" run sleep -q --setup=fail --tries=2 -- " + sleepMs,
        function (err, stdout) {
          expect(err).to.have.property("code", 1);
          expect(stdout.match(/FAIL/g)).to.have.length(1); // Only one try.
          done();
        });
    });

    it("runs setup without -- custom flags", function (done) {
      return exec(
        "node \"" + builder + "\" run sleep -q --setup=echo-forever -- --foo",
        function (err, stdout, stderr) {
          if (err) { return done(err); }

          expect(stdout)
            .to.contain("SLEEP EXTRA FLAGS - --foo").and
            .to.not.contain("ECHO FOREVER EXTRA FLAGS");
          expect(stderr).to.match(STDERR_SETUP_END_RE);
          done();
        });
    });

    // TODO: This one is going to be... tough.
    // https://github.com/FormidableLabs/builder/issues/9
    it("overrides a <archetype> command with a <root> one in a composed <archetype> command");

  });

});
