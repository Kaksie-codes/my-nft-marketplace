import { useState } from 'react';
import AuthPageWrapper from '../components/AuthPageWrapper'
import Button from '../components/button/Button';
import GoogleButton from '../components/button/GoogleButton';
import Input from '../components/inputs/Input';
import { useLocation, useNavigate } from 'react-router-dom';

interface LoginValidationErrors {
  email?: string;
  password?: string;
}

const LoginPage = () => {
   const [formData, setFormData] = useState({    
    email: '',    
    password: ''    
  });

  const [errors, setErrors] = useState<LoginValidationErrors>({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState<boolean>(false);
  const handleInputChange = (field:string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' })); // Clear error for that field
  };

  const validate = () => {
    const errors:LoginValidationErrors = {};
    ;
  
    if (!formData.email.trim()) errors.email = 'email is required';
    if (!formData.password.trim()) errors.password = 'Password is required';  
  
    console.log(errors); // Log errors to debug
    return errors;
  };

    const [googleLoading, setGoogleLoading] = useState<boolean>(false);
    const baseUrl = import.meta.env.VITE_BASE_URL || 'http://localhost:3000';
  
    const location = useLocation();
    const navigate = useNavigate();
  
    // Helper to parse query params
    const getQueryParam = (key: string): string | null => {
      const params = new URLSearchParams(location.search);
      return params.get(key);
    };
  
    const fromValue = getQueryParam("from");
    const refCode = getQueryParam("refCode");


  const signInWithGoogle = () => {
    setGoogleLoading(true);
    fetch(`${baseUrl}/auth/register/google`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setGoogleLoading(false);
        // console.log(data);
        if (data.success) {
          if (typeof window !== "undefined" && data.url) {
            window.location.replace(data.url);
          }
        }
      });
  };

     const login = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Signup function not implemented yet");
    }

  return (
    <AuthPageWrapper
      details={{
        head: 'Welcome Back',
        body: 'Please login to your account to continue.',
      }}
      isLogin={true}
    >
        <form className='flex  flex-col gap-3' onSubmit={login}>
        <Input
          type='text'
          placeholder="Email Address"
          additionalStyles='border-transparent'
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          error={errors.email}
        />
        <Input
          type='password'
          placeholder='Enter your Password'
          value={formData.password}
          forgotpass
          additionalStyles='border-transparent'
          onChange={(e) => handleInputChange('password', e.target.value)}
          error={errors.password}
        />
         <Button
            loading={loading}            
            disabled={loading}
            sxclass={''}
            variant='primary'
          size='lg'
          >
            {loading ? 'Logging in' : 'Log in'}
          </Button>
          <GoogleButton onClick={signInWithGoogle} type="button">
            Log in with google
          </GoogleButton>
      </form>
    </AuthPageWrapper>
  )
}

export default LoginPage
