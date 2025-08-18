import User from "../models/user.model";
import handleError from "../utils/error";

const verifyUser = async (req, res, next) => {
    try{
        const { username, email } = req.method == 'GET' ? req.query : req.body;

        // check if user exists in database
        const user = await User.findOne({"email":email});

        if(!user){
            return next(handleError(404, "User not found" ));            
        }

        // execute the next middleware
        next();
    }catch(error){
        return next(error)
    }
}

export default verifyUser;