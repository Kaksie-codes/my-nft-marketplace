const isAdmin = async (req, res, next) => {
    // console.log('req.user', req.user)
    if(req.user.role === 'admin'){
        next();
    }else{
        res.status(404).json('Access denied because you are not an admin')
    }
}

export default isAdmin;