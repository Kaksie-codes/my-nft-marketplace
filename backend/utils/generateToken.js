import jwt from 'jsonwebtoken'

const generateToken = (res, userId) => {
    const accessToken = jwt.sign({userId}, process.env.SECRET_ACCESS_KEY, {
        expiresIn: '24h'
    })
    res.cookie('jwt', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'development',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
    })
}

export default generateToken;

// expires: new Date(Date.now() + 1000 * 3) // 30 seconds