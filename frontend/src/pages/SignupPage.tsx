import { useEffect, useState } from 'react';
import AuthPageWrapper from '../components/AuthPageWrapper'
import Input from '../components/inputs/Input'
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/button/Button';
import GoogleButton from '../components/button/GoogleButton';

interface SigninValidationErrors {
  email?: string;
  firstname?: string;
  lastname?: string;
  username?: string;
  refCode?: string;
  password?: string;
  confirmPassword?: string;
}

const SignupPage = () => {
  const [loading, setLoading] = useState<boolean>(false);
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

  useEffect(() => {
    // Example: use fromValue or refCode
    console.log("From:", fromValue);
    console.log("Ref Code:", refCode);
  }, [fromValue, refCode]);
    const [formData, setFormData] = useState({
        email: "",
        firstname: "",
        lastname: "",
        username: "",
        refCode: "",
        confirmPassword: "",
        password: "",
    });
    const signup = (e: React.FormEvent) => {
        e.preventDefault();
        alert("Signup function not implemented yet");
    }
    const [errors, setErrors] = useState<SigninValidationErrors>({
    email: "",
    firstname: "",
    lastname: "",
    username: "",
    refCode: "",
    confirmPassword: "",
    password: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" })); // Clear error for that field
  };

  const validate = () => {
    const errors: SigninValidationErrors = {};
    if (!formData.email.trim()) errors.email = "Email is required";

    if (!formData.firstname.trim()) {
      errors.firstname = "First name is required";
    } else if (formData.firstname.length < 3) {
      errors.firstname = "First name must be at least 3 characters";
    } else if (formData.firstname.length > 17) {
      errors.firstname = "First name must be less than 17 characters";
    }

    if (!formData.lastname.trim()) {
      errors.lastname = "Last name is required";
    } else if (formData.lastname.length < 3) {
      errors.lastname = "Last name must be at least 3 characters";
    } else if (formData.lastname.length > 17) {
      errors.lastname = "Last name must be less than 17 characters";
    }

    if (!formData.username.trim()) {
      errors.username = "Username is required";
    } else if (formData.username.length < 3) {
      errors.username = "Username must be at least 3 characters";
    } else if (formData.username.length > 17) {
      errors.username = "Username must be less than 17 characters";
    } else if (formData.username.trim().includes(" ")) {
      errors.username = "Username cannot contain spaces";
    }

    if (!formData.password.trim()) {
      errors.password = "Password is required";
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    } else {
      const regExp = new RegExp(
        "^(?=.*\\d)(?=.*[!@#$%^&*()+-_,.?'\":{}|<>])(?=.*[a-z])(?=.*[A-Z]).{8,}$"
      );
      if (!regExp.test(formData.password)) {
        errors.password =
          "Password must have at least 8 characters, 1 special character, 1 uppercase letter, 1 number, and 1 lowercase letter";
      }
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    console.log(errors); // Log errors to debug
    return errors;
  };

  useEffect(() => {
    if (refCode) {
      setFormData((prev) => ({ ...prev, refCode: refCode }));
    }
  }, [refCode]);

  const signupWithGoogle = () => {
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

  return (
    <AuthPageWrapper
        details={{
            head: 'Create an Account',
            // body: 'Join us to start your journey in Web3.',
            body: 'Enter your details and start creating, collecting and selling NFTs.'
        }}
        isLogin={false}
    >
        <form
        autoComplete="off"
        onSubmit={signup}
        className="flex flex-col gap-3 w-full"
      >
        <Input
          type="email"
          placeholder="Email Address"
          value={formData.email}
          onChange={(e) => handleInputChange("email", e.target.value)}
          error={errors.email}
          additionalStyles="border-transparent"
        />
        <Input
          type="text"
          placeholder="First Name"
          value={formData.firstname}
          onChange={(e) => handleInputChange("firstname", e.target.value)}
          error={errors.firstname}
          additionalStyles="border-transparent"
        />
        <Input
          type="text"
          placeholder="Last Name"
          value={formData.lastname}
          onChange={(e) => handleInputChange("lastname", e.target.value)}
          error={errors.lastname}
          additionalStyles="border-transparent"
        />
        <Input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => handleInputChange("username", e.target.value)}
          error={errors.username}
          additionalStyles="border-transparent"
        />
        <Input
          type="password"
          placeholder="Create Password"
          value={formData.password}
          onChange={(e) => handleInputChange("password", e.target.value)}
          error={errors.password}
          additionalStyles="border-transparent"
        />
        <Input
          type="password"
          placeholder="Confirm Password"
          value={formData.confirmPassword}
          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
          additionalStyles="border-transparent"
        />
        <Input
          type="text"
          placeholder="Refferal Code (Optional)"
          value={
            formData.refCode === null ||
            formData.refCode === undefined ||
            refCode === "null"
              ? ""
              : formData.refCode
          }
          onChange={(e) => handleInputChange("refCode", e.target.value)}
          error={errors.refCode}
          additionalStyles="border-transparent"
          disabled={
            refCode !== null &&
            refCode !== "null" &&
            refCode !== undefined &&
            refCode !== ""
              ? true
              : false
          }
        />
        <Button
          loading={loading}
          disabled={loading}
          sxclass={"mt-4"}
          variant="primary"
          size="lg"
        >
          {loading ? "Processing" : "Create Account"}
        </Button>
      </form>
      <div
        className={
          "py-8 text-sm leading-[150%] text-center tracking-[-0.02em] text-muted font-bold"
        }
      >
        Or
      </div>
      <GoogleButton onClick={signupWithGoogle} type="button">
        {googleLoading ? "a moment please..." : "Sign up with Google"}
      </GoogleButton>
    </AuthPageWrapper>
  )
}

export default SignupPage
