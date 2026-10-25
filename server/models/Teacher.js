const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    department: { type: String, trim: true },
    color: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);
