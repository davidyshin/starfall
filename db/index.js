var pgp = require("pg-promise")({});
var connectionString = "postgres://localhost/highscores";
var db = pgp(connectionString);

module.exports = db;
