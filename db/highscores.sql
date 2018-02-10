DROP DATABASE IF EXISTS highscores;
CREATE DATABASE highscores;
\c highscores;
CREATE TABLE users
(
    ID SERIAL PRIMARY KEY,
    username VARCHAR,
    highscore INT
);
/* tyler, password: 123456 */
INSERT INTO users
    (username, highscore)
VALUES
    ('David', 973),
    ('Helen', 621),
    ('Ben', 531),
    ('Mich', 201),
    ('Xav', 30)