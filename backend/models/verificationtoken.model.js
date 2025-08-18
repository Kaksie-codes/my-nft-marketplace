import mongoose from "mongoose";

const { Schema } = mongoose;

const verificationTokenSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: { 
        type: String,
        required: true
    },
    createdAt: {
        type: Date,        
    },
    expiresAt:{
        type: Date
    }
})


const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);
export default VerificationToken;