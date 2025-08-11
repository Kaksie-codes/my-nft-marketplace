import React from 'react';
import { Mail } from 'lucide-react';


interface NewsletterInputProps {
  label?: string;
  buttonText?: string;
  onSubmit?: (email: string) => void;
}


const NewsletterInput: React.FC<NewsletterInputProps> = ({
  label = 'Enter your email',
  buttonText = 'Subscribe',
  onSubmit,
}) => {
  const [email, setEmail] = React.useState('');
  const [isFocused, setIsFocused] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit) onSubmit(email);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full flex flex-col sm:flex-row items-stretch gap-2 bg-white rounded-[10px] border border-muted p-1 relative"
    >
      <div className="relative flex-1">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="peer w-full px-4 py-2 rounded-[8px] border-none outline-none text-main text-base bg-transparent"
          required
        />
        <label
          className={`absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none transition-all duration-200 bg-white px-1
            ${isFocused || email ? 'text-xs top-1 translate-y-0 text-primary' : 'text-base'}
          `}
        >
          {label}
        </label>
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 px-6 py-2 rounded-[8px] bg-primary text-white font-semibold transition-colors duration-200 hover:bg-primary/90"
      >
        <Mail size={18} /> {buttonText}
      </button>
    </form>
  );
};

export default NewsletterInput;
