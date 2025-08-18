import nodemailer from 'nodemailer'
import ResetOTP from '../models/resetOTP.model.js';
import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import VerificationToken from '../models/VerificationToken.model.js';

const sendEmail = async (mailOptions) => {
    try {
        // configure your service
        let config = {
            host: process.env.MAIL_SERVER,
            port: 465,
            secure: true,
            // service: "gmail",
            auth: {
              user: process.env.MAIL_USER,
              pass: process.env.MAIL_PASS,
            },
          }

        // Create a transporter
        const transporter = nodemailer.createTransport(config);

        // Send email using async/await
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info);

        // Return true if email is sent successfully
        return true;
    } catch (error) {
        console.log('Error sending email:', error);
        // Return false if an error occurs
        return false;
    }
};

const sendVerificationEmail = async (user) => {
    try{
        // destructure the user
        const { username, email, _id:userId} = user;  
        
        // Delete verification token from the database
        await VerificationToken.deleteOne({ owner: userId  });
        
        // Generate a random string for verification token
        const unhashedToken = crypto.randomBytes(32).toString('hex'); 

        // Hash the verification token
        const hashedToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');

        const verificationToken = new VerificationToken({
            owner: userId,
            token: hashedToken,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000 // expires in 1 hour
        })
        
        await verificationToken.save();

        // Include the verification token in the link sent to the user's email
        const verificationLink = `https://netisens.onrender.com/users/${userId}/verify/${unhashedToken}`; // Assuming localhost and port 3000

        // Send a mail to the users email address
         const mailOptions = {
            from:`"Netisens ICT" <nsikakakpan007@gmail.com>`,
            to: email,
            subject: 'Verify your Email',
            html: generateVerificationLinkTemplate(username, verificationLink)
        }
       
        const emailSent = await sendEmail(mailOptions);

        if(emailSent){
            return true
        }else{
            return false
        }
    }catch(error){
        throw error;
    }
}

const generateVerificationLinkTemplate = (username, link) => {    
    return `
   <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>enBlogg - User Verification</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    </head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <img src="https://www.netisens.com/wp-content/uploads/2024/09/netisens-logo-full.webp" alt="enBlogg" width="120" style="display: block; border: 0;"/>
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #272727; font-family: Arial, sans-serif; font-size: 24px;">
                                        <b>Hello 👋 ${username},</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 30px 0; color: #555; font-family: Arial, sans-serif; font-size: 18px;">
                                        Welcome to <b>Netisens ICT</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 30px 0; color: #555; font-family: Arial, sans-serif; font-size: 16px;">
                                        Click on the link to verify your account:
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center">
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" bgcolor="#29F64E" style="border-radius: 5px;">
                                                    <a href="${link}" target="_blank" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; border-radius: 5px; padding: 15px 25px; display: inline-block;">Verify Account</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 30px 0; color: #e74c3c; font-family: Arial, sans-serif; font-size: 14px;">
                                        Valid for 1 hour only
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 0 0; color: #777; font-family: Arial, sans-serif; font-size: 14px;">
                                        If you didn't send this request, kindly ignore it.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
    <style>
      a[href] {
        color: #ffffff;
      }
      a[href]:hover {
        background-color: #22D143 !important; /* Slightly darker shade of the brand color */
      }
    </style>
</body>
</html>
    `
}


const generateAndSendPasswordResetOTP = async(user) => {
    try{
        // destructure the user
        const { username, email, _id:userId} = user;

        // Delete any existing verification tokens associated with the user
        await ResetOTP.deleteMany({owner: userId});

        // Generate the OTP
        const OTP = generateOTP();

        // Hash the OTP
        const saltRounds = 10;
        const hashedOTP = await bcrypt.hash(OTP, saltRounds);

         // create a new Verification token
         const resetToken = new ResetOTP({
            owner: userId,
            OTP: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000 // expires in 1 hour
        });

        // Save the OTP in the database
        await resetToken.save();

         // Send a mail to the users email address
         const mailOptions = {
            from:`"Netisens ICT" <nsikakakpan007@gmail.com>`,
            to: email,
            subject: 'Verify your Email',
            html: generateOTPEmailTemplate(username, OTP)
        }
        await  sendEmail(mailOptions)

    }catch(error){
        throw error;
    }
}

const generateOTP = () => {
    let OTP = '';
    for(let i = 0; i <= 3; i++){
        const randVal = Math.round(Math.random() * 9);
        OTP = OTP + randVal
    }
    return OTP;
}

const generateOTPEmailTemplate = (username, OTP) => {    
    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Password Reset OTP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f6f6;">
    <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
            <td align="center">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse;">
                    <tr>
                        <td align="center" style="padding: 40px 0 30px 0;">
                            <img src="https://www.netisens.com/wp-content/uploads/2024/09/netisens-logo-full.webp" alt="enBlogg" width="120" style="display: block; border: 0;"/>
                        </td>
                    </tr>
                    <tr>
                        <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td align="center" style="color: #272727; font-family: Arial, sans-serif; font-size: 24px;">
                                        <b>Hello 👋 ${username},</b>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 10px 0; color: #555; font-family: Arial, sans-serif; font-size: 18px;">
                                        Here is your OTP
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 0 0 30px 0; color: #555; font-family: Arial, sans-serif; font-size: 16px;">
                                        to reset your password
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 20px 0;">
                                        <table border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td align="center" bgcolor="#f6f6f6" style="border-radius: 5px; padding: 20px;">
                                                    <span style="font-size: 40px; font-weight: bold; letter-spacing: 10px; font-family: Arial, sans-serif;">${OTP}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 30px 0; color: #e74c3c; font-family: Arial, sans-serif; font-size: 14px;">
                                        Valid for 1 hour only
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 20px 0 0 0; color: #777; font-family: Arial, sans-serif; font-size: 14px;">
                                        If you didn't send this request, kindly ignore it.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `
}

export { generateAndSendPasswordResetOTP, sendVerificationEmail }
