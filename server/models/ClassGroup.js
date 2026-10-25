const mongoose = require('mongoose');

const classGroupSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    label: { type: String, trim: true, default: '' },
    semester: { type: Number, required: true },
    totalSections: { type: Number, default: 4 },
    schedule: { type: mongoose.Schema.Types.Mixed, default: null },
    order: { type: Number, default: 9999 },
  },
  { timestamps: true }
);

classGroupSchema.index({ department: 1, label: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('ClassGroup', classGroupSchema);


