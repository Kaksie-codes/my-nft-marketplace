import jwt from 'jsonwebtoken'
import handleError from '../utils/error.js';
import User from '../models/user.model.js';



const protect = async (req, res, next) => {
    let token;
    // Get token from header
    token = req.cookies.jwt ;

    if(token){ 
        try{
            //Verify token
            const decoded = jwt.verify(token, process.env.SECRET_ACCESS_KEY);
    
            // Get user from the token
            req.user = await User.findById(decoded.userId).select('-personal_info.password');
            // console.log('user >>', req.user)
            // run the next middleware 
            next()
        }catch(error){
            // console.log(error);
            return next(handleError(401, 'Unauthorized, invalid token'));  
        }
    }else{
        return next(handleError(401, 'Unauthorized, no token')); 
    }   
}

export const verifyToken = (req, res, next) => {
    const token = req.cookies.access_token;
    
    if(!token){ 
        next(handleError(401, 'Unauthorized')); 
    }

    jwt.verify(token, process.env.SECRET_ACCESS_KEY, (err, user) => {
        if(err){
            next(handleError(401, 'Unauthorized'));              
        }

        req.user = user;
        next(); // Proceed to the next middleware only if the token is successfully verified
    });
};

export { protect };