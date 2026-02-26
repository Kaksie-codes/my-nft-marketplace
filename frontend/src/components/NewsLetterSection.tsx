import { useState } from 'react';
import { Mail, CheckCircle, Loader2 } from 'lucide-react';
import { api } from '../utils/apiClient';

const NewsLetterSection = () => {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setStatus('error');
      setMessage('Please enter a valid email address.');
      return;
    }
    setStatus('loading');
    setMessage('');
    try {
      await api.post('/api/newsletter/subscribe', { email: email.trim().toLowerCase() });
      setStatus('success');
      setMessage("You're subscribed! We'll send updates straight to your inbox.");
      setEmail('');
    } catch (err: unknown) {
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessage(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="my-[70px]">
      <div className="max-w-6xl mx-auto container px-4 sm:px-6 lg:px-8">
        <div className="w-full flex flex-col md:flex-row gap-8 justify-between p-6 md:p-8 items-center rounded-[20px] bg-surface">

          {/* Image */}
          <div className="flex-shrink-0 flex items-center justify-center">
            <img
              src="/newsletter.png"
              alt="Newsletter"
              className="w-40 md:w-auto object-contain"
            />
          </div>

          {/* Text + form */}
          <div className="w-full md:flex-1 text-center md:text-left">
            <h2 className="font-extrabold text-3xl md:text-4xl text-main">
              Join our weekly digest
            </h2>
            <p className="text-lg md:text-xl text-main mt-3">
              Get exclusive promotions & updates straight to your inbox.
            </p>

            {status === 'success' ? (
              <div className="mt-5 inline-flex items-center gap-3 text-green-500 bg-green-500/10 border border-green-500/20 px-4 py-3 rounded-xl">
                <CheckCircle size={20} className="flex-shrink-0" />
                <p className="text-sm font-medium text-left">{message}</p>
              </div>
            ) : (
              <div className="mt-5 w-full max-w-md mx-auto md:mx-0 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Input */}
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setStatus('idle'); setMessage(''); }}
                      onKeyDown={handleKeyDown}
                      placeholder="Enter your email address"
                      className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm bg-background text-main focus:outline-none focus:ring-2 focus:ring-primary transition ${
                        status === 'error' ? 'border-red-500 focus:ring-red-500' : 'border-muted'
                      }`}
                    />
                  </div>
                  {/* Button */}
                  <button
                    onClick={handleSubmit}
                    disabled={status === 'loading'}
                    className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-60 transition"
                  >
                    {status === 'loading'
                      ? <Loader2 size={16} className="animate-spin" />
                      : 'Subscribe'
                    }
                  </button>
                </div>

                {status === 'error' && message && (
                  <p className="text-red-500 text-xs pl-1 text-left">{message}</p>
                )}
                <p className="text-xs text-muted pl-1 text-left">
                  No spam, unsubscribe at any time.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default NewsLetterSection;