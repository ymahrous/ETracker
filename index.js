const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

const User = require('./models/User');
const Exercise = require('./models/Exercise');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Connect to MongoDB
const clientOptions = { serverApi: { version: '1', strict: true, deprecationErrors: true } };
mongoose.connect(process.env.MONGO_URI, clientOptions).then(() => console.log('Connected to MongoDB')).catch(err => console.log('MongoDB connection error:', err));

// Create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const newUser = new User({ username });
  try {
    const savedUser = await newUser.save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch (err) {
    res.status(400).send('Error creating user');
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(400).send('Error fetching users');
  }
});

// Add exercise to user
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;

  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).send('User not found');
    
    const newExercise = new Exercise({
      description,
      duration,
      date: date ? new Date(date) : new Date(),
      userId: _id
    });
    const savedExercise = await newExercise.save();

    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(400).send('Error adding exercise');
  }
});

// Get exercise log of user
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  
  const filter = { userId: _id };
  
  if (from) filter.date = { $gte: new Date(from) };
  if (to) filter.date = { $lte: new Date(to) };
  
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(404).send('User not found');

    const exercises = await Exercise.find(filter).limit(limit ? parseInt(limit) : 0);
    const logs = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: logs
    });
  } catch (err) {
    res.status(400).send('Error fetching exercise logs');
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
