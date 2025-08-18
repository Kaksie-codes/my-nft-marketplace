export const errorHandler = (err, req, res, next) => {
    let statusCode;
    let message;
    if(err.name === 'CastError' && err.kind === 'ObjectId'){
        statusCode = 404,
        message = 'Resource not found'
    }else{
        statusCode = err.statusCode || 500;
        message = err.message || 'Internal Server Error';
    }

    res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      stack: process.env.NODE_ENV === 'production' ? null : err.stack
    });
}