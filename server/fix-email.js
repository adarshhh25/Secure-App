import mongoose from 'mongoose';
import User from './models/User.js';
import 'dotenv/config';

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix email addresses missing '@'
const fixEmails = async () => {
  try {
    // Find users with invalid email format (missing '@')
    const usersWithInvalidEmails = await User.find({
      email: { $not: /@/ }
    });

    console.log(`Found ${usersWithInvalidEmails.length} users with invalid email addresses`);

    for (const user of usersWithInvalidEmails) {
      const oldEmail = user.email;
      
      // Attempt to fix the email by inserting '@' before 'gmail.com', 'yahoo.com', etc.
      let newEmail = oldEmail;
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      
      for (const domain of domains) {
        if (oldEmail.includes(domain) && !oldEmail.includes(`@${domain}`)) {
          newEmail = oldEmail.replace(domain, `@${domain}`);
          break;
        }
      }

      if (newEmail !== oldEmail && newEmail.includes('@')) {
        console.log(`Fixing: ${oldEmail} -> ${newEmail}`);
        user.email = newEmail;
        await user.save();
        console.log(`✅ Fixed email for user: ${user.fullName}`);
      } else {
        console.log(`⚠️  Could not auto-fix: ${oldEmail} (please fix manually)`);
      }
    }

    console.log('\n✅ Email fix process completed');
  } catch (error) {
    console.error('❌ Error fixing emails:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Disconnected from MongoDB');
  }
};

// Run the script
(async () => {
  await connectDB();
  await fixEmails();
})();
