const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: String,
  duration: Number,
  date: Date,
});

const User = mongoose.model("User", userSchema);
const Exercise = mongoose.model("Exercise", exerciseSchema);

app.post("/api/users", async (req, res) => {
  const user = new User({ username: req.body.username });
  const data = await user.save();
  res.json({ username: data.username, _id: data._id });
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}, "_id username");
  res.json(users);
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const { description, duration, date } = req.body;
  const user = await User.findById(req.params._id);

  if (!user) return res.json({ error: "User not found" });

  const exercise = new Exercise({
    userId: user._id,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date(),
  });

  const data = await exercise.save();
  res.json({
    _id: user._id,
    username: user.username,
    date: data.date.toDateString(),
    duration: data.duration,
    description: data.description,
  });
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const user = await User.findById(req.params._id);
  if (!user) return res.json({ error: "User not found" });

  let query = { userId: user._id };
  const { from, to, limit } = req.query;

  if (from || to) {
    query.date = {};
    if (from) query.date.$gte = new Date(from);
    if (to) query.date.$lte = new Date(to);
  }

  let exercises = Exercise.find(query).select("description duration date");
  if (limit) exercises = exercises.limit(parseInt(limit));

  const log = await exercises.exec();

  res.json({
    _id: user._id,
    username: user.username,
    count: log.length,
    log: log.map((ex) => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    })),
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
