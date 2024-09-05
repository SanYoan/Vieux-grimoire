const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const User = require("../models/users");

exports.signup = (req, res, next) => {
  bcrypt
    .hash(req.body.password, 10)
    .then((hash) => {
      const user = new User({
        email: req.body.email,
        password: hash,
      });
      return user.save();
    })
    .then(() => res.status(201).json({ message: "Utilisateur crée !" }))
    .catch((error) => res.status(400).json({ error }));
};

exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email })
    .then((user) => {
      if (user === null) {
        return res
          .status(403)
          .json({ message: "Paire identifiant/mot de passe incorrecte" });
      } else {
        return bcrypt
          .compare(req.body.password, user.password)
          .then((valid) => {
            if (!valid) {
              return res
                .status(403)
                .json({ message: "Paire identifiant/mot de passe incorrecte" });
            } else {
              const token = jwt.sign(
                { userId: user._id },
                "RANDOM_TOKEN_SECRET",
                { expiresIn: "24h" }
              );
              return res.status(200).json({
                userId: user._id,
                token: token,
              });
            }
          });
      }
    })
    .catch((error) => res.status(500).json({ error }));
};
