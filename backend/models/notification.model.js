import mongoose from "mongoose";

const { Schema } = mongoose;

const notificationSchema = new Schema({
    type: {
        type: String,
        enum: ["like", "comment", "reply", "edit"],
        required: true
    },
    blogPost: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'BlogPost'
    },
    notification_for: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    user: { 
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }, 
    comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    },
    reply: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    }, 
    replied_on_comment: {
        type: Schema.Types.ObjectId,
        ref: 'Comment'
    },
    seen: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
