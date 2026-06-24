import mongoose from 'mongoose';

const heroBannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  link: {
    type: String,
    trim: true
  },
  linkText: {
    type: String,
    default: 'Shop Now'
  },
  active: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

const HeroBanner = mongoose.model('HeroBanner', heroBannerSchema);

export default HeroBanner;