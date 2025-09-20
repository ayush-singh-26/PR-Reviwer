import mongoose from 'mongoose';


const userSchema = new mongoose.Schema({
    githubId: String,
    username: String,
    accessToken: String, // store OAuth token (consider encrypting)
    refreshToken: String, // if applicable
});

export default mongoose.model('User', userSchema);
