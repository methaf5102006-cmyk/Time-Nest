const mongoose = require('mongoose');

const timeConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    slots: [
      {
        _id: false,
        no: { type: Number, required: true },
        time: { type: String, required: true, trim: true },
        fridayTime: { type: String, default: '', trim: true },
      },
    ],
    breakAfter: { type: Number, default: 0 },
    breakTime: { type: String, default: '', trim: true },
    breakFridayTime: { type: String, default: '', trim: true },
    fridayDepartments: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimeConfig', timeConfigSchema);
