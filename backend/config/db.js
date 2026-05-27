const mongoose = require('mongoose');

// Disable query buffering globally so operations fail fast if DB is disconnected
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  const dbUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager';
  
  console.log(`🔄 Attempting to connect to MongoDB...`);
  
  try {
    const conn = await mongoose.connect(dbUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s on initial connection
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.log('🔄 Retrying in 5 seconds...');
    
    // Retry connection instead of exiting process
    setTimeout(connectDB, 5000);
  }
};

// Monitor connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error event:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected! Future queries will fail fast.');
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established.');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB successfully reconnected.');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination.');
    process.exit(0);
  } catch (err) {
    console.error('Error during database close:', err);
    process.exit(1);
  }
});

module.exports = connectDB;