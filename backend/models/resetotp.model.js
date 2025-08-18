import mongoose from "mongoose";

const { Schema } = mongoose;

const resetOTPSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    OTP: {
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


const ResetOTP = mongoose.model('ResetOTP', resetOTPSchema);
export default ResetOTP;