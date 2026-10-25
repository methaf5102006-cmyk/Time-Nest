const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['theory', 'practical'], default: 'theory' },
    weeklyTarget: { type: Number, default: 4, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subject', subjectSchema);
