import mongoose from "mongoose";

const { Schema } = mongoose;

let profile_imgs_name_list = ["Garfield", "Tinkerbell", "Annie", "Loki", "Cleo", "Angel", "Bob", "Mia", "Coco", "Gracie", "Bear", "Bella", "Abby", "Harley", "Cali", "Leo", "Luna", "Jack", "Felix", "Kiki"];
let profile_imgs_collections_list = ["notionists-neutral", "adventurer-neutral", "fun-emoji"];

const userSchema = new Schema({
    username:{
        type: String, 
        required: true, 
        unique: true,        
    },
    firstName: { 
        type: String,
    },
    lastName: { 
        type: String,         
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    phoneNumber: { 
        type: String 
    },
    gender: { 
        type: String, 
        enum: ['Male', 'Female'] 
    },
    role: { 
        type: String, 
        enum: ['Superadmin', 'Admin',], 
        default: 'Admin' 
    },
    refCode:{
      type: String,
      unique: true
    },
    referrals: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    isVerified: { 
        type: Boolean, 
        default: false 
    },   
    isBanned: { 
        type: Boolean, 
        default: false 
    },
    isSuspended: { 
        type: Boolean, 
        default: false 
    },  
    profile_img: {
        type: String,
        default: '',
        default: () => {
            return `https://api.dicebear.com/6.x/${profile_imgs_collections_list[Math.floor(Math.random() * profile_imgs_collections_list.length)]}/svg?seed=${profile_imgs_name_list[Math.floor(Math.random() * profile_imgs_name_list.length)]}`
        } 
    },   
    isGoogleAuth: {
        type: Boolean,
        default: false
    }    
}, 
{ 
    timestamps: {
        createdAt: 'joinedAt'
    } 
});


const User = mongoose.model('User', userSchema);
export default User;