require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const requireAuth = require('./middleware/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Timetable server is running');
});

app.use('/api/auth', require('./routes/authRoutes'));

// Everything below needs a valid login token
app.use('/api/teachers', requireAuth, require('./routes/teacherRoutes'));
app.use('/api/subjects', requireAuth, require('./routes/subjectRoutes'));
app.use('/api/classes', requireAuth, require('./routes/classRoutes'));
app.use('/api/lectures', requireAuth, require('./routes/lectureRoutes'));
app.use('/api/schedule', requireAuth, require('./routes/scheduleRoutes'));

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try {
      await require('./models/ClassGroup').syncIndexes();
    } catch (err) {
      console.error('Index sync failed:', err.message);
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

