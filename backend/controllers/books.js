const Book = require("../models/books");
const fs = require("fs");

exports.createBook = async (req, res, next) => {
  try {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject._userId;

    const book = new Book({
      ...bookObject,
      userId: req.auth.userId,
      imageUrl: `${req.protocol}://${req.get("host")}/images/${
        req.file.filename
      }`,
    });

    await book.save();
    res.status(201).json(book);
  } catch (error) {
    res
      .status(400)
      .json({ error: error.message || "Erreur lors de la création du livre" });
  }
};

exports.modifyBook = async (req, res, next) => {
  try {
    const bookObject = req.file
      ? {
          ...JSON.parse(req.body.book),
          imageUrl: `${req.protocol}://${req.get("host")}/images/${
            req.file.filename
          }`,
        }
      : { ...req.body };

    delete bookObject._userId;

    const book = await Book.findOne({ _id: req.params.id });

    if (!book) {
      return res.status(404).json({ message: "Livre non trouvé" });
    }

    if (book.userId !== req.auth.userId) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    if (req.file) {
      const oldFilename = book.imageUrl.split("/images/")[1];
      fs.unlink(`images/${oldFilename}`, (err) => {
        if (err) {
          console.error(
            "Erreur lors de la suppression de l'ancienne image:",
            err
          );
        }
      });
    }

    await Book.updateOne(
      { _id: req.params.id },
      { ...bookObject, _id: req.params.id }
    );
    res.status(200).json({ message: "Livre modifié avec succès" });
  } catch (error) {
    res.status(400).json({
      error: error.message || "Erreur lors de la modification du livre",
    });
  }
};

exports.deleteBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (book.userId != req.auth.userId) {
        res.status(403).json({ message: "Not authorized" });
      } else {
        const filename = book.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Book.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(204).json();
            })
            .catch((error) => res.status(403).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};

exports.getOneBook = (req, res, next) => {
  Book.findOne({ _id: req.params.id })
    .then((book) => res.status(200).json(book))
    .catch((error) => res.status(404).json({ error }));
};

exports.getAllBook = (req, res, next) => {
  Book.find()
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

exports.getBestBook = (req, res, next) => {
  Book.find()
    .sort({ averageRating: -1 })
    .limit(3)
    .then((books) => res.status(200).json(books))
    .catch((error) => res.status(400).json({ error }));
};

exports.ratingBook = (req, res, next) => {
  const userId = req.body.userId;
  const rating = req.body.rating;

  if (!userId) {
    return res.status(400).json({ message: "ID utilisateur requis" });
  }
  if (rating < 0 || rating > 5) {
    return res.status(400).json({ error: "La note doit être entre 0 et 5" });
  }

  Book.findOne({ _id: req.params.id })
    .then((book) => {
      if (!book) {
        return res.status(404).json({ message: "Livre non trouvé" });
      }

      const userRating = book.ratings.find(
        (rating) => rating.userId === userId
      );

      if (userRating) {
        return res
          .status(400)
          .json({ message: "L'utilisateur a déjà noté ce livre." });
      }

      book.ratings.push({ userId, grade: rating });

      const totalRatings = book.ratings.length;
      const sumRatings = book.ratings.reduce(
        (sum, rating) => sum + rating.grade,
        0
      );
      const averageRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
      book.averageRating = averageRating;

      book
        .save()
        .then((updatedBook) => {
          res.status(200).json(updatedBook);
        })
        .catch((error) => {
          res
            .status(500)
            .json({ error: "Erreur lors de la mise à jour du livre" });
        });
    })
    .catch((error) => res.status(500).json({ error: "Erreur serveur" }));
};
