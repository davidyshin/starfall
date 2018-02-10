const db = require("./index");

function getAllUsers(req, res, next) {
  db
    .any("select * from users")
    .then(function(data) {
      res.status(200).json({
        status: "success",
        data: data,
        message: "Retrieved ALL users"
      });
    })
    .catch(function(err) {
      return next(err);
    });
}

function newUser(user, score, res) {
    db
      .none(
        `insert into users (username, score) values (${user}, ${score})`
        
      )
      .then(function(data) {
        res.status(200).json({
          status: "success",
          message: ""
        });
      })
      .catch(function(err) {
        return next(err);
      });
  }
module.exports = {
  getAllUsers: getAllUsers,
  newUser: newUser
};
